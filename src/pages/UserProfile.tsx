import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Linkedin, Facebook, Instagram, Globe,
  Building2, Award, Star, BadgeCheck, TrendingUp, BarChart3,
} from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const profileQuery = useQuery({
    queryKey: ["user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Solo columnas públicas: los datos fiscales/de contacto (RUC, teléfono,
      // dirección fiscal, representante legal, email) no se muestran en
      // perfiles públicos y están revocados para visitantes sin sesión
      // (ver migración de seguridad 2026-07-19).
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, bio, account_type, organization_name, organization_type, business_name, business_sector, country, linkedin, facebook, tiktok, instagram, website, created_at"
        )
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const registrationsQuery = useQuery({
    queryKey: ["user-registrations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events(*)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const gamificationQuery = useQuery({
    queryKey: ["user-gamification", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const profile = profileQuery.data;
  const registrations = registrationsQuery.data ?? [];
  const gamification = gamificationQuery.data;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach((reg: any) => {
      const type = reg.events?.type;
      if (type) {
        counts[type] = (counts[type] ?? 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [registrations]);

  const accountLabel =
    profile?.account_type === "persona_natural" ? "Voluntario" :
    profile?.account_type === "ong" ? "ONG / Organización" :
    profile?.account_type === "empresa" ? "Empresa" : null;

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">Cargando perfil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground mb-4">Usuario no encontrado.</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const isOrgAccount = profile.account_type === "ong" || profile.account_type === "empresa";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="w-24 h-24 ring-4 ring-background shadow-sm border border-border">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-3xl font-bold">
                {(profile.full_name ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {profile.full_name ?? "Usuario"}
                </h1>
                {accountLabel && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {accountLabel}
                  </Badge>
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground max-w-xl text-sm leading-relaxed mb-4 mx-auto sm:mx-0">
                  {profile.bio}
                </p>
              )}

              {(profile.website || profile.instagram || profile.linkedin || profile.facebook) && (
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-3 text-sm text-primary">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                      <Globe className="w-4 h-4" /> Sitio Web
                    </a>
                  )}
                  {profile.instagram && (
                    <a href={profile.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                      <Instagram className="w-4 h-4" /> Instagram
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                      <Linkedin className="w-4 h-4" /> LinkedIn
                    </a>
                  )}
                  {profile.facebook && (
                    <a href={profile.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                      <Facebook className="w-4 h-4" /> Facebook
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Organization / Business details */}
        {isOrgAccount && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-card shadow-card p-6"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              {profile.account_type === "ong" ? "Detalles de la Organización" : "Detalles de la Empresa"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {/* Los datos fiscales/de contacto (RUC, representante legal,
                  dirección y distrito fiscal) ya no se muestran en perfiles
                  públicos — ver auditoría de seguridad 2026-07. */}
              {profile.account_type === "ong" ? (
                <>
                  {profile.organization_name && (
                    <div><Label className="text-muted-foreground">Nombre de la organización</Label><p className="font-medium">{profile.organization_name}</p></div>
                  )}
                  {profile.organization_type && (
                    <div><Label className="text-muted-foreground">Tipo</Label><p className="font-medium">{profile.organization_type}</p></div>
                  )}
                  {profile.country && (
                    <div><Label className="text-muted-foreground">País</Label><p className="font-medium">{profile.country}</p></div>
                  )}
                </>
              ) : (
                <>
                  {profile.business_name && (
                    <div><Label className="text-muted-foreground">Nombre comercial</Label><p className="font-medium">{profile.business_name}</p></div>
                  )}
                  {profile.business_sector && (
                    <div><Label className="text-muted-foreground">Rubro</Label><p className="font-medium">{profile.business_sector}</p></div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Gamification stats */}
        {gamification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-border bg-card shadow-card p-6"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              Estadísticas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-bold text-foreground">{gamification.total_points}</p>
                <p className="text-xs text-muted-foreground">Puntos</p>
              </div>
              <div className="text-center">
                <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold text-foreground">{gamification.events_completed}</p>
                <p className="text-xs text-muted-foreground">Eventos completados</p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold text-foreground">{gamification.current_streak}</p>
                <p className="text-xs text-muted-foreground">Racha actual</p>
              </div>
              <div className="text-center">
                <Award className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p className="text-2xl font-bold text-foreground">{gamification.longest_streak}</p>
                <p className="text-xs text-muted-foreground">Mejor racha</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category breakdown */}
        {!isOrgAccount && categoryCounts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              Preferencias del voluntario
            </h2>
            <div className="flex flex-wrap gap-3">
              {categoryCounts.map(([type, count]) => {
                const emojiMap: Record<string, string> = {
                  Limpieza: "🌊", Reforestación: "🌱", Educación: "📚",
                  Social: "🤝", Salud: "❤️", Animales: "🐾",
                };
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-card"
                  >
                    <span className="text-xl">{emojiMap[type] ?? "📋"}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{type}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "vez" : "veces"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserProfile;
