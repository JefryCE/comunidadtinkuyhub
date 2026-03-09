import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Clock, ArrowLeft, Users, Lock, Unlock,
  BarChart3, TrendingUp, Star,
} from "lucide-react";
import { toast } from "sonner";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { confirmAttendance, markNoShow, BADGES } from "@/lib/gamification";
import EventFeedback from "@/components/EventFeedback";
import EventPhotos from "@/components/EventPhotos";

type Registration = {
  id: string;
  user_id: string;
  attendance_status: string;
  points_awarded: boolean;
  registered_at: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
};

const ManageAttendance = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [togglingReg, setTogglingReg] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const eventQuery = useQuery({
    queryKey: ["event-detail", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const registrationsQuery = useQuery({
    queryKey: ["event-registrations", eventId],
    enabled: !!eventId && !!user,
    queryFn: async (): Promise<Registration[]> => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, user_id, attendance_status, points_awarded, registered_at")
        .eq("event_id", eventId!);

      if (error) throw error;
      const regs = (data ?? []) as any[];

      const userIds = regs.map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return regs.map((r) => ({
        ...r,
        profile: profileMap.get(r.user_id) ?? null,
      }));
    },
  });

  const isCreator = eventQuery.data?.created_by === user?.id;
  const regs = registrationsQuery.data ?? [];
  const confirmed = regs.filter((r) => r.attendance_status === "confirmed").length;
  const noShows = regs.filter((r) => r.attendance_status === "no_show").length;
  const pending = regs.filter((r) => r.attendance_status === "pending").length;
  const attendanceRate = regs.length > 0 ? Math.round((confirmed / regs.length) * 100) : 0;

  // Check if current user has confirmed attendance (for feedback)
  const myRegistration = regs.find((r) => r.user_id === user?.id);
  const canLeaveFeedback = myRegistration?.attendance_status === "confirmed";

  const handleConfirm = async (reg: Registration) => {
    setProcessing(reg.id);
    try {
      const result = await confirmAttendance(reg.id, reg.user_id);
      toast.success(`✅ Asistencia confirmada. +${result.pointsEarned} puntos otorgados.`);
      if (result.newBadges.length > 0) {
        result.newBadges.forEach((badgeId) => {
          const badge = BADGES.find((b) => b.id === badgeId);
          if (badge) toast(`${badge.emoji} ${reg.profile?.full_name ?? "Voluntario"} ganó: ${badge.name}!`);
        });
      }
      queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al confirmar asistencia");
    } finally {
      setProcessing(null);
    }
  };

  const handleNoShow = async (reg: Registration) => {
    setProcessing(reg.id);
    try {
      await markNoShow(reg.id);
      toast("❌ Marcado como no asistió.");
      queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al actualizar");
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmAll = async () => {
    const pendingRegs = regs.filter((r) => r.attendance_status === "pending");
    if (pendingRegs.length === 0) return;

    setProcessing("all");
    let count = 0;
    for (const reg of pendingRegs) {
      try {
        await confirmAttendance(reg.id, reg.user_id);
        count++;
      } catch { /* continue */ }
    }
    toast.success(`✅ ${count} asistencias confirmadas`);
    queryClient.invalidateQueries({ queryKey: ["event-registrations", eventId] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    setProcessing(null);
  };

  const toggleRegistration = async () => {
    if (!eventId) return;
    setTogglingReg(true);
    try {
      const newValue = !(eventQuery.data as any)?.registration_open;
      const { error } = await supabase
        .from("events")
        .update({ registration_open: newValue })
        .eq("id", eventId);
      if (error) throw error;
      toast.success(newValue ? "🔓 Inscripciones abiertas" : "🔒 Inscripciones cerradas");
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setTogglingReg(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</Badge>;
      case "no_show":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" /> No asistió</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    }
  };

  const registrationOpen = (eventQuery.data as any)?.registration_open !== false;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver al Dashboard
        </Button>

        {eventQuery.data && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {eventQuery.data.emoji} {eventQuery.data.title}
              </h1>
              <p className="text-muted-foreground mt-1">Gestionar evento</p>
            </div>
            {isCreator && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRegistration}
                disabled={togglingReg}
              >
                {registrationOpen ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
                {registrationOpen ? "Cerrar inscripciones" : "Abrir inscripciones"}
              </Button>
            )}
          </div>
        )}

        {!isCreator && !eventQuery.isLoading && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm mb-6">
            Solo el creador del evento puede gestionar la asistencia.
          </div>
        )}

        {isCreator && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
                <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{regs.length}</p>
                <p className="text-xs text-muted-foreground">Inscritos</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
                <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                <p className="text-2xl font-bold text-yellow-600">{pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center shadow-card">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa asistencia</p>
              </div>
            </div>

            {/* Bulk actions */}
            {pending > 0 && (
              <div className="flex gap-2 mb-6">
                <Button
                  size="sm"
                  onClick={handleConfirmAll}
                  disabled={processing === "all"}
                  className="gradient-cta text-primary-foreground border-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Confirmar todos ({pending})
                </Button>
              </div>
            )}

            {/* Registrations list */}
            {registrationsQuery.isLoading ? (
              <p className="text-muted-foreground text-center">Cargando inscripciones...</p>
            ) : regs.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nadie se ha inscrito aún a este evento.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {regs.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={reg.profile?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(reg.profile?.full_name ?? "V").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-card-foreground text-sm">
                          {reg.profile?.full_name ?? "Voluntario"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrito: {new Date(reg.registered_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {statusBadge(reg.attendance_status)}
                      {reg.attendance_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                            disabled={!!processing}
                            onClick={() => handleConfirm(reg)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={!!processing}
                            onClick={() => handleNoShow(reg)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <Separator className="my-8" />

            {/* Photos */}
            {eventId && <EventPhotos eventId={eventId} isCreator={isCreator} />}

            <Separator className="my-8" />

            {/* Feedback */}
            {eventId && (
              <EventFeedback
                eventId={eventId}
                isCreator={isCreator}
                canLeaveFeedback={canLeaveFeedback}
              />
            )}
          </>
        )}

        {/* Non-creator feedback section */}
        {!isCreator && eventId && canLeaveFeedback && (
          <>
            <Separator className="my-8" />
            <EventFeedback eventId={eventId} isCreator={false} canLeaveFeedback={true} />
          </>
        )}

        {/* Photos visible for non-creators too */}
        {!isCreator && eventId && (
          <>
            <Separator className="my-8" />
            <EventPhotos eventId={eventId} isCreator={false} />
          </>
        )}
      </main>
    </div>
  );
};

export default ManageAttendance;
