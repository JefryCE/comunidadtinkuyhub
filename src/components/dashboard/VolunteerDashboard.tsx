import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  Users,
  MapPin,
  Clock,
  Eye,
  Heart,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { claimPendingPoints, BADGES } from "@/lib/gamification";
import { isEventPast } from "@/lib/utils";


type EventRow = {
  id: string;
  emoji: string;
  type: string;
  title: string;
  location: string;
  date: string;
  max_volunteers: number;
  color: string;
  description: string;
  schedule: string;
  requirements: string;
  created_at: string;
  created_by: string | null;
  latitude: number | null;
  longitude: number | null;
  registration_open?: boolean;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  attendance_status?: string;
};

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all upcoming events
  const eventsQuery = useQuery({
    queryKey: ["vol-dashboard-events"],
    enabled: !!user,
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  // Fetch user's registrations
  const regsQuery = useQuery({
    queryKey: ["vol-registrations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RegistrationRow[]> => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, user_id, registered_at, attendance_status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  // Fetch who the user is following
  const followsQuery = useQuery({
    queryKey: ["vol-follows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows" as any)
        .select("following_id")
        .eq("follower_id", user!.id);
      return (data ?? []).map((f: any) => f.following_id) as string[];
    },
  });

  // Filter out events that have already finished
  const activeEvents = useMemo(() => {
    return (eventsQuery.data ?? []).filter(e => !isEventPast(e.date, e.schedule));
  }, [eventsQuery.data]);

  // Collect creator profiles for the active events
  const creatorIds = useMemo(() => {
    return [...new Set(activeEvents.map((e) => e.created_by).filter(Boolean) as string[])];
  }, [activeEvents]);

  const profilesQuery = useQuery({
    queryKey: ["dashboard-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", creatorIds);
      return data ?? [];
    },
  });

  const creatorMap = useMemo(() => {
    const map: Record<string, any> = {};
    (profilesQuery.data ?? []).forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [profilesQuery.data]);

  const joinedEventIds = useMemo(
    () => new Set((regsQuery.data ?? []).map((r) => r.event_id)),
    [regsQuery.data]
  );

  const myJoinedEvents = useMemo(
    () => activeEvents.filter((e) => joinedEventIds.has(e.id)),
    [activeEvents, joinedEventIds]
  );

  const networkEvents = useMemo(() => {
    const followingIds = new Set(followsQuery.data ?? []);
    if (followingIds.size === 0) return [];
    // Show events from followed users that the volunteer HAS NOT joined yet
    return activeEvents.filter(
      (e) => e.created_by && followingIds.has(e.created_by) && !joinedEventIds.has(e.id)
    );
  }, [activeEvents, followsQuery.data, joinedEventIds]);

  // Handle claiming pending points automatically
  useEffect(() => {
    if (!user) return;
    
    const claimPoints = async () => {
      try {
        const { newPoints, newBadges } = await claimPendingPoints(user.id);
        if (newPoints > 0) {
          toast.success(`🎉 ¡Asistencia validada! Has ganado +${newPoints} puntos.`);
          if (newBadges.length > 0) {
            newBadges.forEach((badgeId) => {
              const badge = BADGES.find((b) => b.id === badgeId);
              if (badge) toast.success(`🏅 ¡Medalla desbloqueada: ${badge.name}!`);
            });
          }
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
        }
      } catch (error) {
        console.error("Failed to claim points", error);
      }
    };
    claimPoints();
  }, [user, queryClient]);

  const confirmedCount = (regsQuery.data ?? []).filter(
    (r) => r.attendance_status === "confirmed"
  ).length;

  // Next upcoming event
  const nextEvent = myJoinedEvents.length > 0 ? myJoinedEvents[0] : null;
  const daysUntilNext = nextEvent
    ? Math.ceil(
        (new Date(nextEvent.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handleLeave = async (eventId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Te has salido del evento");
      queryClient.invalidateQueries({ queryKey: ["vol-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["vol-dashboard-events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al salir del evento");
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-bold text-foreground">
            ¡Hola, voluntario!
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Aquí puedes ver tus próximos eventos, tu progreso y mantenerte al día con tu participación comunitaria.
        </p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Eventos inscritos"
          value={myJoinedEvents.length}
          color="text-blue-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Asistencias"
          value={confirmedCount}
          color="text-emerald-500"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Próximo evento"
          value={daysUntilNext !== null ? `${daysUntilNext}d` : "—"}
          color="text-amber-500"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total inscripciones"
          value={(regsQuery.data ?? []).length}
          color="text-violet-500"
        />
      </div>

      {/* My upcoming events */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">
          Mis próximos eventos
        </h2>
        {myJoinedEvents.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">
              Aún no te has inscrito a ningún evento
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Explora los eventos disponibles y únete a los que más te interesen.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/eventos")}
            >
              <MapPin className="w-4 h-4 mr-1" /> Ver mapa de eventos
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myJoinedEvents.map((ev, i) => {
              const reg = (regsQuery.data ?? []).find(
                (r) => r.event_id === ev.id
              );
              const isConfirmed = reg?.attendance_status === "confirmed";
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
                >
                  <div className="flex">
                    <div
                      className={`w-1.5 shrink-0 bg-gradient-to-b ${ev.color}`}
                    />
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base sm:text-lg truncate">
                            {ev.emoji} {ev.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {ev.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isConfirmed ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                              ✓ Confirmado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inscrito</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {ev.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> {ev.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {ev.schedule}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/evento/${ev.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Ver detalle
                        </Button>
                        {!isConfirmed && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => handleLeave(ev.id)}
                          >
                            Salirme
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Eventos de mi red */}
      {followsQuery.data && followsQuery.data.length > 0 && (
        <div className="pt-8 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              De las organizaciones que sigues
            </h2>
          </div>
          {networkEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay nuevos eventos de las organizaciones a las que estás siguiendo en este momento.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {networkEvents.map((ev, i) => {
                const creator = ev.created_by ? creatorMap[ev.created_by] : null;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/50 hover:shadow-card transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                          {(creator?.full_name ?? "O").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground line-clamp-1">
                          {creator?.full_name ?? "Organizador"}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-sm line-clamp-2 mb-1">
                        {ev.emoji} {ev.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {ev.location}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {ev.date}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={() => navigate(`/evento/${ev.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver detalles e inscribirme
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-2xl p-4 text-center shadow-card"
  >
    <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
    <p className="text-2xl font-extrabold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </motion.div>
);

export default VolunteerDashboard;
