import { useEffect, useState } from "react";
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
  const { isAdmin, isModerator } = useUserRole();
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

  // Fetch account_type from profiles
  const profileQuery = useQuery({
    queryKey: ["profile-account-type", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.account_type as string | null | undefined;
    },
  });

  const accountType = profileQuery.data;
  const isOng     = accountType === "ong";
  const isEmpresa = accountType === "empresa";
  const isOrgType = isOng || isEmpresa; // any org account

  // Set default view based on account_type ONLY if there is no view in URL
  useEffect(() => {
    if (profileQuery.isLoading || profileQuery.isFetching || view) return;
    
    if (isOrgType) {
      setView("organization");
    } else {
      setView("volunteer");
    }
  }, [isOrgType, profileQuery.isLoading, profileQuery.isFetching, view]);

  // While resolving account_type, show a centered spinner
  if (!view || profileQuery.isLoading) {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
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
