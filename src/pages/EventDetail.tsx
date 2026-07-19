import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MapPin, Calendar, Users, Clock, ClipboardList, ArrowLeft,
  CheckCircle2, Lock, CalendarPlus, Bus,
} from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ShareEvent from "@/components/ShareEvent";
import EventFeedback from "@/components/EventFeedback";
import EventPhotos from "@/components/EventPhotos";

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
  registration_open: boolean;
  whatsapp_group_link: string | null;
  offers_transport: boolean;
  is_multiday: boolean;
};

const getGoogleCalendarUrl = (event: EventRow) => {
  try {
    const cleanDateStr = event.date
      .toLowerCase()
      .replace(/de/g, "")
      .replace(/,/g, "")
      .trim();
    
    const parts = cleanDateStr.split(/\s+/);
    if (parts.length < 3) return null;
    
    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const year = parseInt(parts[2], 10);
    
    const months: Record<string, number> = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    
    const month = months[monthName] ?? 0;
    
    const timeParts = event.schedule.split("-");
    const startTimeStr = timeParts[0]?.trim();
    const endTimeStr = timeParts[1]?.trim() ?? startTimeStr;
    
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (!match) return { hours: 9, minutes: 0 };
      
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3].toLowerCase();
      
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      
      return { hours, minutes };
    };
    
    const start = parseTime(startTimeStr);
    const end = parseTime(endTimeStr);
    
    const startDate = new Date(year, month, day, start.hours, start.minutes);
    const endDate = new Date(year, month, day, end.hours, end.minutes);
    
    if (endDate.getTime() < startDate.getTime()) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const toUtcString = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    const dates = `${toUtcString(startDate)}/${toUtcString(endDate)}`;
    const details = `${event.description}\n\nRequisitos: ${event.requirements}`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.emoji + " " + event.title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`;
  } catch (e) {
    console.error("Failed to parse calendar dates", e);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.emoji + " " + event.title)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`;
  }
};

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [followingState, setFollowingState] = useState(false);

  const eventQuery = useQuery({
    queryKey: ["event-detail", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventRow> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data as unknown as EventRow;
    },
  });

  const registrationsQuery = useQuery({
    queryKey: ["event-registrations-count", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const myRegQuery = useQuery({
    queryKey: ["my-event-reg", eventId, user?.id],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, attendance_status, transport_stop_id")
        .eq("event_id", eventId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stopsQuery = useQuery({
    queryKey: ["event-transport-stops", eventId],
    enabled: !!eventId && !!eventQuery.data?.offers_transport,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_transport_stops" as any)
        .select("*")
        .eq("event_id", eventId!)
        .order("stop_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["event-sessions", eventId],
    enabled: !!eventId && !!eventQuery.data?.is_multiday,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_sessions" as any)
        .select("*")
        .eq("event_id", eventId!)
        .order("session_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const creatorQuery = useQuery({
    queryKey: ["event-creator", eventQuery.data?.created_by],
    enabled: !!eventQuery.data?.created_by,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", eventQuery.data!.created_by!)
        .maybeSingle();
      return data;
    },
  });

  const followQuery = useQuery({
    queryKey: ["is-following", eventQuery.data?.created_by, user?.id],
    enabled: !!eventQuery.data?.created_by && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_follows" as any)
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", eventQuery.data!.created_by!)
        .maybeSingle();
      return !!data;
    },
  });

  const event = eventQuery.data;
  const regCount = registrationsQuery.data ?? 0;
  const isCreator = user?.id === event?.created_by;
  const myReg = myRegQuery.data;

  // Selected stop state for registration
  const [selectedStopId, setSelectedStopId] = useState<string>("none");
  const [updatingStop, setUpdatingStop] = useState(false);

  useEffect(() => {
    if (myReg) {
      setSelectedStopId(myReg.transport_stop_id || "none");
    }
  }, [myReg]);
  const isRegistered = !!myReg;
  const isConfirmed = myReg?.attendance_status === "confirmed";
  const isFollowing = followQuery.data ?? false;

  const handleFollowToggle = async () => {
    if (!user) {
      toast.info("Inicia sesión para seguir organizaciones.");
      navigate("/auth");
      return;
    }
    if (!event?.created_by) return;

    setFollowingState(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_follows" as any)
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", event.created_by);
        toast.success("Dejaste de seguir a este organizador.");
      } else {
        await supabase
          .from("user_follows" as any)
          .insert({ follower_id: user.id, following_id: event.created_by });
        toast.success("¡Ahora sigues a este organizador!");
      }
      await queryClient.invalidateQueries({ queryKey: ["is-following"] });
    } catch (e: any) {
      toast.error("Error al actualizar seguimiento.");
    } finally {
      setFollowingState(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!event) return;

    setJoining(true);
    try {
      const regData: any = { event_id: event.id, user_id: user.id };
      if (event.offers_transport && selectedStopId !== "none") {
        regData.transport_stop_id = selectedStopId;
      }

      const { error } = await supabase
        .from("event_registrations")
        .insert(regData);
      if (error) throw error;

      toast.success(`🎉 ¡Te inscribiste a "${event.title}"!`);
      toast.info("📅 ¡Ya puedes guardar este evento en tu Google Calendar con el nuevo botón en pantalla!", { duration: 6000 });
      toast.info("⏳ Los puntos se otorgarán cuando confirmen tu asistencia.", { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["my-event-reg", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-registrations-count", eventId] });
    } catch (e: any) {
      if (e?.code === "23505") {
        toast.info("Ya estás inscrito en este evento");
      } else {
        toast.error(e?.message ?? "Error al inscribirse");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleUpdateStop = async (stopId: string) => {
    if (!user || !myReg) return;
    setUpdatingStop(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ transport_stop_id: stopId === "none" ? null : stopId } as any)
        .eq("id", myReg.id);
      if (error) throw error;
      toast.success("🚌 Punto de recogida actualizado.");
      queryClient.invalidateQueries({ queryKey: ["my-event-reg", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al actualizar transporte");
    } finally {
      setUpdatingStop(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !event || !myReg) return;

    setLeaving(true);
    try {
      if (isConfirmed) {
        const { error } = await supabase.rpc("reset_attendance_and_deduct" as any, {
          p_registration_id: myReg.id,
          p_volunteer_id: user.id
        });
        if (error) console.error("Error resetting points through RPC, falling back to delete: ", error);
      }

      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Te has desinscrito del evento.");
      queryClient.invalidateQueries({ queryKey: ["my-event-reg", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-registrations-count", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al salir del evento");
    } finally {
      setLeaving(false);
    }
  };

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center text-muted-foreground">Cargando evento...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground mb-4">Evento no encontrado.</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const capacityPercent = Math.min(100, Math.round((regCount / event.max_volunteers) * 100));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          <div className={`h-3 bg-gradient-to-r ${event.color}`} />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-4xl">{event.emoji}</span>
              <Badge className="text-xs">{event.type}</Badge>
              {!event.registration_open && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="w-3 h-3" /> Inscripciones cerradas
                </Badge>
              )}
              {isRegistered && (
                <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  {isConfirmed ? "Asistencia confirmada" : "Inscrito (pendiente)"}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">{event.title}</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">{event.description}</p>

            {/* Info grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <span>{event.schedule}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <span>{regCount} voluntarios inscritos</span>
              </div>
            </div>

            {/* WhatsApp Group Link */}
            {isRegistered && event.whatsapp_group_link && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 mb-6 flex items-center gap-3"
              >
                <svg className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-700 dark:text-green-400 text-sm">
                    Grupo de WhatsApp del Evento
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 truncate">
                    Únete para coordinar con el equipo
                  </p>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shrink-0" asChild>
                  <a href={event.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                    Unirme al grupo
                  </a>
                </Button>
              </motion.div>
            )}

            {/* Event sessions section */}
            {event.is_multiday && sessionsQuery.data && sessionsQuery.data.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 mb-4">
                  <Calendar className="w-4.5 h-4.5 text-primary" /> Programa / Jornadas del Evento
                </h3>
                <div className="relative pl-6 border-l border-primary/20 space-y-5 ml-2.5">
                  {sessionsQuery.data.map((session: any, idx: number) => {
                    const formattedDate = format(new Date(session.date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: es });
                    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                    return (
                      <div key={session.id} className="relative">
                        <div className="absolute -left-[32px] top-1 bg-primary text-primary-foreground rounded-full w-[22px] h-[22px] flex items-center justify-center shadow-sm">
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {session.title || `Jornada ${idx + 1}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              📅 {capitalizedDate}
                            </span>
                            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              🕒 {session.start_time} - {session.end_time}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transport itinerary section */}
            {event.offers_transport && stopsQuery.data && stopsQuery.data.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-xl p-5 mb-6">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 mb-3">
                  <Bus className="w-4 h-4 text-primary" /> Ruta de Transporte Opcional
                </h3>
                <div className="relative pl-6 border-l border-primary/20 space-y-4 ml-2.5">
                  {stopsQuery.data.map((stop: any, idx: number) => (
                    <div key={stop.id} className="relative">
                      <div className="absolute -left-[31px] top-1 bg-background border-2 border-primary rounded-full w-[20px] h-[20px] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          {stop.name} 
                          <span className="text-[11px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            🕒 {stop.pickup_time}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{stop.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="font-semibold text-foreground text-sm mb-1">📋 Requisitos</p>
              <p className="text-sm text-muted-foreground">{event.requirements}</p>
            </div>

            {/* Organizer */}
            {creatorQuery.data && (
              <div className="flex items-center justify-between mb-6 bg-muted/40 rounded-xl p-3 sm:p-4 border border-border">
                <button
                  onClick={() => navigate(`/organizacion/${event.created_by}`)}
                  className="flex items-center gap-3 text-sm text-left hover:opacity-80 transition-opacity group/org focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(creatorQuery.data.full_name ?? "O").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground group-hover/org:underline group-hover/org:text-primary transition-colors">Visitar perfil de organizador</p>
                    <p className="font-bold text-foreground line-clamp-1">{creatorQuery.data.full_name ?? "Organizador"}</p>
                  </div>
                </button>
                {!isCreator && user && event?.created_by && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className={isFollowing ? "shrink-0 min-w-[110px] border-primary text-primary hover:bg-destructive hover:text-white hover:border-destructive group" : "gradient-cta text-primary-foreground border-0 shrink-0 min-w-[110px]"}
                    onClick={handleFollowToggle}
                    disabled={followingState}
                  >
                    {isFollowing ? (
                      <>
                        <span className="group-hover:hidden flex items-center font-semibold">
                           Siguiendo
                        </span>
                        <span className="hidden group-hover:block">Dejar de seguir</span>
                      </>
                    ) : "Seguir"}
                  </Button>
                )}
              </div>
            )}

            {/* Transport stop selection */}
            {event.offers_transport && stopsQuery.data && stopsQuery.data.length > 0 && !isCreator && (
              <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6">
                <p className="font-semibold text-foreground text-sm mb-2 flex items-center gap-1.5">
                  <Bus className="w-4 h-4 text-primary" /> 
                  {isRegistered ? "Tu punto de recogida de ida" : "¿Necesitas transporte de ida?"}
                </p>
                <div className="flex gap-3 items-center">
                  <select
                    value={selectedStopId}
                    onChange={(e) => {
                      setSelectedStopId(e.target.value);
                      if (isRegistered) {
                        handleUpdateStop(e.target.value);
                      }
                    }}
                    disabled={updatingStop || (isRegistered && leaving)}
                    className="flex-1 bg-background border border-input rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="none">🚶 No, iré por mi cuenta</option>
                    {stopsQuery.data.map((stop: any) => (
                      <option key={stop.id} value={stop.id}>
                        🚌 {stop.name} ({stop.pickup_time})
                      </option>
                    ))}
                  </select>
                  {updatingStop && <span className="text-xs text-muted-foreground animate-pulse">Guardando...</span>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!isRegistered && !isCreator && (
                <Button
                  className="gradient-cta text-primary-foreground border-0 hover:opacity-90"
                  disabled={joining || !event.registration_open}
                  onClick={handleJoin}
                >
                  {!event.registration_open
                    ? "🔒 Inscripciones cerradas"
                    : joining
                    ? "Inscribiendo..."
                    : "Unirme al evento"}
                </Button>
              )}
              {isRegistered && !isCreator && (
                <>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 font-semibold"
                    asChild
                  >
                    <a
                      href={getGoogleCalendarUrl(event) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <CalendarPlus className="w-4 h-4 mr-1.5" />
                      Guardar en Google Calendar
                    </a>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={leaving}
                        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-semibold"
                      >
                        Cancelar inscripción
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar tu inscripción al evento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Liberarás tu cupo para que otros voluntarios puedan participar. 
                          {isConfirmed && " Al confirmarse ya tu asistencia anterior, al salirte se restablecerán y descontarán los puntos de este evento de tu perfil."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleLeave}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          Confirmar salida
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {isCreator && (
                <Button variant="outline" onClick={() => navigate(`/evento/${event.id}/asistencia`)}>
                  <ClipboardList className="w-4 h-4 mr-1" /> Gestionar asistencia
                </Button>
              )}
              <ShareEvent title={event.title} description={event.description} eventId={event.id} />
              {event.latitude && event.longitude && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="w-4 h-4 mr-1" /> Cómo llegar
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 bg-card border border-border rounded-2xl shadow-card p-6"
        >
          <EventPhotos
            eventId={event.id}
            isCreator={isCreator}
            isModeratorOrAdmin={isAdmin || isModerator}
          />
        </motion.div>

        {/* Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-card border border-border rounded-2xl shadow-card p-6"
        >
          <EventFeedback
            eventId={event.id}
            isCreator={isCreator}
            canLeaveFeedback={isConfirmed}
          />
        </motion.div>
      </main>
    </div>
  );
};

export default EventDetail;
