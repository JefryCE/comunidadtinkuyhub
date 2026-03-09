import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Navigation, Loader2, Users, CalendarDays, CheckCircle2, ExternalLink, Filter } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ShareEvent from "@/components/ShareEvent";

// Fix default marker icons for Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const eventIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  latitude?: number;
  longitude?: number;
};

/** Generate pseudo-random but stable coordinates near a base point based on event id */
const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
};

const generateCoords = (
  eventId: string,
  baseLat: number,
  baseLng: number
): [number, number] => {
  const h = hashCode(eventId);
  const latOffset = ((h % 1000) / 1000) * 0.06 - 0.03;
  const lngOffset = (((h >> 10) % 1000) / 1000) * 0.06 - 0.03;
  return [baseLat + latOffset, baseLng + lngOffset];
};

/** Recenter map when position changes */
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

const EventsMap = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [locating, setLocating] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Default: Lima, Peru
  const defaultPos: [number, number] = [-12.0464, -77.0428];

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setGeoError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const eventsQuery = useQuery({
    queryKey: ["events-map"],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  // Fetch user registrations
  const regsQuery = useQuery({
    queryKey: ["map-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.event_id));
    },
  });

  const joinedIds = regsQuery.data ?? new Set<string>();

  const center = userPos ?? defaultPos;

  const eventsWithCoords = useMemo(() => {
    const filtered = (eventsQuery.data ?? []).filter(
      (ev) => activeFilter === "all" || ev.type === activeFilter
    );
    return filtered.map((ev) => {
      if (ev.latitude != null && ev.longitude != null) {
        return { ...ev };
      }
      const [lat, lng] = generateCoords(ev.id, center[0], center[1]);
      return { ...ev, latitude: lat, longitude: lng };
    });
  }, [eventsQuery.data, center, activeFilter]);

  const eventTypes = useMemo(() => {
    const types = new Set((eventsQuery.data ?? []).map((ev) => ev.type));
    return Array.from(types);
  }, [eventsQuery.data]);

  const handleJoin = async (eventId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setJoining(eventId);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
      toast.success("¡Te uniste al evento! 🎉");
      queryClient.invalidateQueries({ queryKey: ["map-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.info("Ya estás inscrito en este evento");
      } else {
        toast.error("Error al unirse: " + err.message);
      }
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16 h-screen flex flex-col">
        {/* Header bar */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Eventos cerca de ti</h1>
            {locating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Obteniendo ubicación…
              </span>
            )}
            {geoError && !userPos && (
              <Badge variant="secondary">Ubicación no disponible – mostrando Lima</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Inicio
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full z-0"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={center[0]} lng={center[1]} />

            {/* User position marker */}
            {userPos && (
              <Marker position={userPos} icon={userIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold text-sm">📍 Tu ubicación</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Event markers */}
            {eventsWithCoords.map((ev) => (
              <Marker
                key={ev.id}
                position={[ev.latitude!, ev.longitude!]}
                icon={eventIcon}
              >
                <Popup>
                  <div className="min-w-[220px]">
                    <p className="font-bold text-sm">
                      {ev.emoji} {ev.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {ev.location}
                      </p>
                      <p className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {ev.date}
                      </p>
                      <p className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {ev.max_volunteers} voluntarios
                      </p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {joinedIds.has(ev.id) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ya estás inscrito
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoin(ev.id)}
                          disabled={joining === ev.id}
                          className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {joining === ev.id ? "Uniéndose…" : "Unirme al evento"}
                        </button>
                      )}
                      <ShareEvent title={ev.title} description={ev.description} eventId={ev.id} size="sm" variant="ghost" />
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Event count overlay */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-md border border-border rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3"
          >
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {eventsWithCoords.length} evento{eventsWithCoords.length !== 1 ? "s" : ""} cerca de ti
            </span>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default EventsMap;
