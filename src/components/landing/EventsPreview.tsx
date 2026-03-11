import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import EventCard from "@/components/landing/EventCard";

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
  registration_open?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

const EVENT_TYPES = ["Limpieza", "Reforestación", "Educación", "Social", "Salud", "Animales"];
const TYPE_EMOJIS: Record<string, string> = {
  Limpieza: "🌊", Reforestación: "🌱", Educación: "📚", Social: "🤝", Salud: "❤️", Animales: "🐾",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const EventsPreview = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [joining, setJoining] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {/* silently fail */}
      );
    }
  }, []);

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

  const creatorIds = useMemo(() => {
    const ids = (eventsQuery.data ?? []).map((e) => e.created_by).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [eventsQuery.data]);

  const profilesQuery = useQuery({
    queryKey: ["event-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);
      return data ?? [];
    },
  });

  const creatorNames = useMemo(() => {
    const map: Record<string, string> = {};
    (profilesQuery.data ?? []).forEach((p) => {
      map[p.id] = p.full_name || "Organizador";
    });
    return map;
  }, [profilesQuery.data]);

  const allEvents = eventsQuery.data ?? [];

  // Compute distances and sort by proximity
  const eventsWithDistance = useMemo(() => {
    return allEvents.map((e) => {
      let distanceKm: number | null = null;
      if (userLocation && e.latitude != null && e.longitude != null) {
        distanceKm = haversineKm(userLocation.lat, userLocation.lng, e.latitude, e.longitude);
      }
      return { ...e, distanceKm };
    });
  }, [allEvents, userLocation]);

  const filteredEvents = useMemo(() => {
    let result = eventsWithDistance;
    // Hide closed events from public view
    result = result.filter((e) => e.registration_open !== false);
    if (typeFilter !== "all") {
      const q = typeFilter.toLowerCase();
      result = result.filter((e) => e.type.toLowerCase().includes(q));
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
    // Sort: events with known distance first (nearest), then the rest
    result = [...result].sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm != null) return -1;
      if (b.distanceKm != null) return 1;
      return 0;
    });
    return result;
  }, [eventsWithDistance, typeFilter, searchQuery]);

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
    <section id="eventos" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Próximos eventos
          </span>
          {userLocation && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Ordenados por cercanía a tu ubicación
            </p>
          )}
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
          <Carousel
            opts={{ align: "start", loop: filteredEvents.length > 3 }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {filteredEvents.map((event) => (
                <CarouselItem key={event.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <EventCard
                    event={event}
                    creatorName={event.created_by ? (creatorNames[event.created_by] || "Organizador") : "Organizador"}
                    joining={joining === event.id}
                    onJoin={() => handleJoin(event)}
                    onViewDetails={() => navigate(`/evento/${event.id}`)}
                    distanceKm={event.distanceKm}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 sm:-left-5" />
            <CarouselNext className="-right-4 sm:-right-5" />
          </Carousel>
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
