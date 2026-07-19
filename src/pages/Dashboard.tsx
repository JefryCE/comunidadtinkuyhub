import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Building2, Shield, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import VolunteerDashboard from "@/components/dashboard/VolunteerDashboard";
import OrgDashboard from "@/components/dashboard/OrgDashboard";
import AdminPanel from "@/components/dashboard/AdminPanel";

type DashboardView = "volunteer" | "organization" | "admin";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isModerator, isLoading: rolesLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("view") as DashboardView) || null;

  const setView = (newView: DashboardView) => {
    searchParams.set("view", newView);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Fetch account_type from profiles, falling back to user_metadata if row doesn't exist yet
  const profileQuery = useQuery({
    queryKey: ["profile-account-type", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user!.id)
        .maybeSingle();

      if (data?.account_type) return data.account_type as string;

      const meta = user!.user_metadata ?? {};

      // Profile exists but account_type is missing — try to recover from metadata
      if (data && !data.account_type) {
        const accountTypeFromMeta = (meta.account_type as string | undefined) ?? null;
        if (accountTypeFromMeta) {
          await supabase.from("profiles").upsert(
            { id: user!.id, account_type: accountTypeFromMeta } as any,
            { onConflict: "id" }
          );
          return accountTypeFromMeta;
        }
        return null;
      }

      // Profile row doesn't exist yet — create it from user_metadata so the
      // dashboard shows the correct view without requiring a visit to /profile.
      const accountTypeFromMeta = (meta.account_type as string | undefined) ?? null;
      await supabase.from("profiles").upsert(
        {
          id: user!.id,
          full_name: (meta.full_name as string | undefined) ?? null,
          account_type: accountTypeFromMeta,
          organization_name: (meta.organization_name as string | undefined) ?? null,
          organization_type: (meta.organization_type as string | undefined) ?? null,
          legal_representative: (meta.legal_representative as string | undefined) ?? null,
          country: (meta.country as string | undefined) ?? null,
          fiscal_district: (meta.fiscal_district as string | undefined) ?? null,
          business_name: (meta.business_name as string | undefined) ?? null,
          business_sector: (meta.business_sector as string | undefined) ?? null,
          fiscal_address: (meta.fiscal_address as string | undefined) ?? null,
          ruc: (meta.ruc as string | undefined) ?? null,
          avatar_url: null,
        } as any,
        { onConflict: "id" }
      );
      return accountTypeFromMeta;
    },
  });

  const accountType = profileQuery.data;
  const isOng     = accountType === "ong";
  const isEmpresa = accountType === "empresa";
  const isOrgType = isOng || isEmpresa; // any org account

  // Set default view based on account_type ONLY if there is no view in URL.
  // Wait for both profile AND roles to load so that admins/moderators land
  // on the moderation panel instead of the volunteer view.
  useEffect(() => {
    if (profileQuery.isLoading || profileQuery.isFetching || rolesLoading || view) return;

    if (isAdmin || isModerator) {
      setView("admin");
    } else if (isOrgType) {
      setView("organization");
    } else {
      setView("volunteer");
    }
  }, [isAdmin, isModerator, isOrgType, profileQuery.isLoading, profileQuery.isFetching, rolesLoading, view]);

  // While resolving auth, account_type, or roles, show a centered spinner
  if (loading || !view || profileQuery.isLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const subtitle =
    view === "volunteer"
      ? "Tu espacio como voluntario."
      : view === "admin"
      ? "Panel de administración total — gestiona la comunidad."
      : isEmpresa
      ? "Panel de empresa — gestiona tus eventos y mide tu impacto."
      : "Panel de organización — gestiona tus eventos y mide tu impacto.";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className={`mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 transition-all ${view === "admin" ? "max-w-7xl" : "max-w-5xl"}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Mi Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Inicio
          </Button>
        </div>

        {/* View toggle — ONLY visible for admins & moderators (can switch between both views) */}
        {(isAdmin || isModerator) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Vista de administrador
              </span>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-card">
              <button
                onClick={() => setView("volunteer")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "volunteer"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className="w-4 h-4" />
                Voluntarios
              </button>
              <button
                onClick={() => setView("organization")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "organization"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Organización
              </button>
              <button
                onClick={() => setView("admin")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "admin"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="w-4 h-4" />
                Moderación
              </button>
            </div>
          </motion.div>
        )}

        {/* Dashboard content — strictly locked to each account type */}
        {view === "volunteer" ? (
          <VolunteerDashboard />
        ) : view === "admin" ? (
          <AdminPanel />
        ) : (
          <OrgDashboard />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
