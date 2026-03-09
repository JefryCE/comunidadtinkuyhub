import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MapPin, Calendar, Users, Clock, ClipboardList, ArrowLeft,
  CheckCircle2, Lock,
} from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
};

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);

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
        .select("id, attendance_status")
        .eq("event_id", eventId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  const event = eventQuery.data;
  const regCount = registrationsQuery.data ?? 0;
  const isCreator = user?.id === event?.created_by;
  const myReg = myRegQuery.data;
  const isRegistered = !!myReg;
  const isConfirmed = myReg?.attendance_status === "confirmed";

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!event) return;

    setJoining(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .insert({ event_id: event.id, user_id: user.id });
      if (error) throw error;

      toast.success(`🎉 ¡Te inscribiste a "${event.title}"!`);
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
                <span>{regCount} / {event.max_volunteers} voluntarios</span>
              </div>
            </div>

            {/* Capacity bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Capacidad</span>
                <span>{capacityPercent}%</span>
              </div>
              <Progress value={capacityPercent} className="h-2" />
            </div>

            {/* Requirements */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="font-semibold text-foreground text-sm mb-1">📋 Requisitos</p>
              <p className="text-sm text-muted-foreground">{event.requirements}</p>
            </div>

            {/* Organizer */}
            {creatorQuery.data && (
              <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {(creatorQuery.data.full_name ?? "O").slice(0, 2).toUpperCase()}
                </div>
                <span>Organizado por <strong className="text-foreground">{creatorQuery.data.full_name ?? "Organizador"}</strong></span>
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
          <EventPhotos eventId={event.id} isCreator={isCreator} />
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
