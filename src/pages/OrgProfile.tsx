import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { isEventPast } from "@/lib/utils";
import {
  MapPin, CalendarDays, ArrowLeft, Users, Building2, Eye, CheckCircle2,
} from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const OrgProfile = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [followingState, setFollowingState] = useState(false);

  // Fetch the organization profile
  const orgQuery = useQuery({
    queryKey: ["org-profile", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch the events created by this organization
  const eventsQuery = useQuery({
    queryKey: ["org-events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upcomingEvents = useMemo(() => {
    return (eventsQuery.data ?? []).filter((e: any) => !isEventPast(e.date, e.schedule));
  }, [eventsQuery.data]);

  const pastEvents = useMemo(() => {
    return (eventsQuery.data ?? []).filter((e: any) => isEventPast(e.date, e.schedule));
  }, [eventsQuery.data]);

  // Check if current user is following this organization
  const followQuery = useQuery({
    queryKey: ["is-following", orgId, user?.id],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows" as any)
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", orgId!)
        .maybeSingle();
      return !!data;
    },
  });

  const org = orgQuery.data;
  const events = upcomingEvents;
  const isFollowing = followQuery.data ?? false;
  const isSelf = user?.id === orgId;

  const handleFollowToggle = async () => {
    if (!user) {
      toast.info("Inicia sesión para seguir organizaciones.");
      navigate("/auth");
      return;
    }

    setFollowingState(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_follows" as any)
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", orgId);
        toast.success("Dejaste de seguir a este organizador.");
      } else {
        await supabase
          .from("user_follows" as any)
          .insert({ follower_id: user.id, following_id: orgId });
        toast.success(`¡Ahora sigues a ${org?.full_name ?? "este organizador"}!`);
      }
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
    } catch (e: any) {
      toast.error("Error al actualizar seguimiento.");
    } finally {
      setFollowingState(false);
    }
  };

  if (orgQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">Cargando perfil...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground mb-4">Organización no encontrada.</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const isOrgAccount = org.account_type === "ong" || org.account_type === "empresa";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>

        {/* Organization Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shrink-0">
              {(org.full_name ?? "O").slice(0, 2).toUpperCase()}
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {org.full_name ?? "Organización"}
                </h1>
                {isOrgAccount && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {org.account_type === "ong" ? "ONG" : "Empresa"}
                  </Badge>
                )}
              </div>
              
              <p className="text-muted-foreground max-w-xl text-sm leading-relaxed mb-4 mx-auto sm:mx-0">
                {org.bio ?? "Esta organización no ha agregado una descripción pública todavía."}
              </p>

              {(org.website || org.instagram || org.linkedin || org.facebook) && (
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-6 text-sm text-primary">
                  {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline">Sitio Web</a>}
                  {org.instagram && <a href={org.instagram} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
                  {org.linkedin && <a href={org.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>}
                  {org.facebook && <a href={org.facebook} target="_blank" rel="noreferrer" className="hover:underline">Facebook</a>}
                </div>
              )}
            </div>

            {!isSelf && (
              <div className="sm:ml-auto">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  className={isFollowing ? "min-w-[140px] border-primary text-primary hover:bg-destructive hover:text-white hover:border-destructive group" : "min-w-[140px] gradient-cta text-primary-foreground border-0"}
                  onClick={handleFollowToggle}
                  disabled={followingState}
                >
                  {isFollowing ? (
                    <>
                      <span className="group-hover:hidden flex items-center"><CheckCircle2 className="w-4 h-4 mr-2"/> Siguiendo</span>
                      <span className="hidden group-hover:block">Dejar de seguir</span>
                    </>
                  ) : (
                    "Seguir organizador"
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Organization's active events */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Eventos activos de esta organización
            </h2>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">
                No hay eventos programados
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                La organización no cuenta con eventos activos al momento.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-card transition-all"
                >
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {ev.type}
                    </Badge>
                    <h3 className="font-bold text-foreground text-lg line-clamp-2 mb-2">
                      {ev.emoji} {ev.title}
                    </h3>
                    <div className="flex flex-col gap-2 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/> {ev.location}</span>
                      <span className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5"/> {ev.date} - {ev.schedule}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-5 w-full bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => navigate(`/evento/${ev.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> Consultar evento
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrgProfile;
