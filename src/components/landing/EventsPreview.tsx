import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import CreateEventDialog from "./CreateEventDialog";
import ShareEvent from "@/components/ShareEvent";

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
};

const EventsPreview = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const events = eventsQuery.data ?? [];

  const handleJoin = async (event: EventRow) => {
    if (!user) {
      toast.info("Inicia sesión para inscribirte en un evento.");
      navigate("/auth");
      return;
    }

    setJoining(event.id);
    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.info("Ya estás inscrito en este evento.");
        return;
      }

      const { error } = await supabase
        .from("event_registrations")
        .insert({ event_id: event.id, user_id: user.id });

      if (error) throw error;

      toast.success(`🎉 ¡Te has inscrito a "${event.title}"!`);
      toast.info("⏳ Los puntos se otorgarán cuando el organizador confirme tu asistencia.", { duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo completar la inscripción.");
    } finally {
      setJoining(null);
      setSelectedEvent(null);
    }
  };

  return (
    <>
      <section id="eventos" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Próximos eventos
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Eventos que te esperan
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Encuentra actividades de voluntariado cerca de ti y únete a la comunidad.
            </p>
            <CreateEventDialog />
          </motion.div>

          {eventsQuery.isLoading ? (
            <p className="text-center text-muted-foreground">Cargando eventos...</p>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground">No hay eventos disponibles por el momento.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-hero transition-all duration-300 group"
                >
                  <div className={`h-2 bg-gradient-to-r ${event.color}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{event.emoji}</span>
                      <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">
                        {event.type}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{event.max_volunteers} voluntarios máx.</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedEvent(event)}>
                        Ver detalles
                      </Button>
                      <Button
                        className="flex-1 gradient-cta text-primary-foreground border-0 hover:opacity-90"
                        size="sm"
                        disabled={joining === event.id}
                        onClick={() => handleJoin(event)}
                      >
                        {joining === event.id ? "Inscribiendo..." : "Unirme"}
                      </Button>
                      <ShareEvent title={event.title} description={event.description} eventId={event.id} size="icon" variant="ghost" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-10"
          >
            <Button variant="outline" size="lg" onClick={() => toast.info("📋 ¡Próximamente! La lista completa de eventos estará disponible pronto.")}>
              Ver todos los eventos
            </Button>
          </motion.div>
        </div>
      </section>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedEvent.emoji}</span>
                  <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">
                    {selectedEvent.type}
                  </span>
                </div>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                <DialogDescription>{selectedEvent.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedEvent.date} • {selectedEvent.schedule}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{selectedEvent.max_volunteers} voluntarios máx.</span>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-semibold text-foreground mb-1">Requisitos</p>
                  <p className="text-muted-foreground">{selectedEvent.requirements}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  className="flex-1 gradient-cta text-primary-foreground border-0 hover:opacity-90"
                  disabled={joining === selectedEvent.id}
                  onClick={() => handleJoin(selectedEvent)}
                >
                  {joining === selectedEvent.id ? "Inscribiendo..." : "Unirme al evento"}
                </Button>
                <ShareEvent title={selectedEvent.title} description={selectedEvent.description} eventId={selectedEvent.id} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventsPreview;
