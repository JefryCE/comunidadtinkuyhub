import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

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
  registration_open?: boolean;
};

const EVENT_TYPES = ["Limpieza", "Reforestación", "Educación", "Social", "Salud", "Animales"];
const TYPE_EMOJIS: Record<string, string> = {
  Limpieza: "🌊", Reforestación: "🌱", Educación: "📚", Social: "🤝", Salud: "❤️", Animales: "🐾",
};

const EventsPreview = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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

  const allEvents = eventsQuery.data ?? [];

  const filteredEvents = useMemo(() => {
    let result = allEvents;
    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allEvents, typeFilter, searchQuery]);

  const handleJoin = async (event: EventRow) => {
    if (event.registration_open === false) {
      toast.error("Las inscripciones para este evento están cerradas.");
      return;
    }
    if (!user) {
      toast.info("Inicia sesión para inscribirte en un evento.");
      navigate("/auth");
      return;
    }

    setJoining(event.id);
    try {
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
    }
  };

  return (
    <section id="eventos" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
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

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge
              variant={typeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTypeFilter("all")}
            >
              Todos
            </Badge>
            {EVENT_TYPES.map((type) => (
              <Badge
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setTypeFilter(type)}
              >
                {TYPE_EMOJIS[type]} {type}
              </Badge>
            ))}
          </div>
        </div>

        {eventsQuery.isLoading ? (
          <p className="text-center text-muted-foreground">Cargando eventos...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-center text-muted-foreground">
            {searchQuery || typeFilter !== "all"
              ? "No se encontraron eventos con esos filtros."
              : "No hay eventos disponibles por el momento."}
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/evento/${event.id}`)}
                    >
                      Ver detalles
                    </Button>
                    <Button
                      className="flex-1 gradient-cta text-primary-foreground border-0 hover:opacity-90"
                      size="sm"
                      disabled={joining === event.id || event.registration_open === false}
                      onClick={() => handleJoin(event)}
                    >
                      {event.registration_open === false ? "🔒 Cerrado" : joining === event.id ? "Inscribiendo..." : "Unirme"}
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
          <Button variant="outline" size="lg" onClick={() => navigate("/eventos")}>
            Ver todos en el mapa
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EventsPreview;
