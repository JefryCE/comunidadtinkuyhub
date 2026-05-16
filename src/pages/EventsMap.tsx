import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Loader2, Users, CalendarDays, CheckCircle2,
  ExternalLink, Filter, Crosshair, Search, X, ChevronLeft, ChevronRight,
  Clock,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ShareEvent from "@/components/ShareEvent";
import { isEventPast } from "@/lib/utils";

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

// ─── Mejora 2: Pines personalizados por categoría ───
const TYPE_EMOJIS: Record<string, string> = {
  Limpieza: "🌊",
  Reforestación: "🌱",
  Educación: "📚",
  Social: "🤝",
  Salud: "❤️",
  Animales: "🐾",
};

const TYPE_COLORS: Record<string, string> = {
  Limpieza: "#0ea5e9",
  Reforestación: "#22c55e",
  Educación: "#8b5cf6",
  Social: "#f59e0b",
  Salud: "#ef4444",
  Animales: "#ec4899",
};

const createCategoryIcon = (type: string) => {
  const emoji = TYPE_EMOJIS[type] ?? "📌";
  const color = TYPE_COLORS[type] ?? "#6366f1";
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">
      <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
    </div>`,
    className: "custom-marker-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

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

// ─── Mejora 3: Botón "Centrar en mí" ───
const RecenterButton = ({ userPos }: { userPos: [number, number] | null }) => {
  const map = useMap();
  if (!userPos) return null;
  return (
    <button
      onClick={() => map.flyTo(userPos, 14, { duration: 1.2 })}
      className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-lg hover:bg-primary hover:text-primary-foreground transition-all group"
      title="Centrar en mi ubicación"
    >
      <Crosshair className="w-5 h-5" />
    </button>
  );
};

// ─── Mejora 4: Detectar eventos en vista actual ───
const MapBoundsTracker = ({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) => {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map]);

  return null;
};

// ─── Mejora 5: Buscador de lugares ───
type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const PlaceSearch = () => {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      toast.error("Error al buscar ubicación");
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = (r: NominatimResult) => {
    map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 14, { duration: 1.5 });
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-72">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ciudad o distrito..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8 pr-8 h-9 bg-card/95 backdrop-blur-md border-border shadow-lg text-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={searching}
          className="h-9 px-3 shadow-lg"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => selectPlace(r)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

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
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  const creatorIds = useMemo(() => {
    const ids = (eventsQuery.data ?? []).map((e) => e.created_by).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [eventsQuery.data]);

  const profilesQuery = useQuery({
    queryKey: ["event-creators-map", creatorIds],
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
    (profilesQuery.data ?? []).forEach((p: any) => {
      map[p.id] = p.full_name || "Organizador";
    });
    return map;
  }, [profilesQuery.data]);

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
    let filtered = (eventsQuery.data ?? []).filter(
      (ev) =>
        (ev as any).registration_open !== false &&
        (activeFilter === "all" || ev.type === activeFilter)
    );
    
    // Filtro inteligente de pasados
    if (!showPastEvents) {
      filtered = filtered.filter((ev) => !isEventPast(ev.date, ev.schedule));
    }
    
    return filtered.map((ev) => {
      if (ev.latitude != null && ev.longitude != null) {
        return { ...ev };
      }
      const [lat, lng] = generateCoords(ev.id, center[0], center[1]);
      return { ...ev, latitude: lat, longitude: lng };
    });
  }, [eventsQuery.data, center, activeFilter]);

  // ─── Mejora 4: Eventos visibles en el mapa ───
  const visibleEvents = useMemo(() => {
    if (!mapBounds) return eventsWithCoords;
    return eventsWithCoords.filter((ev) => {
      if (ev.latitude == null || ev.longitude == null) return false;
      return mapBounds.contains([ev.latitude, ev.longitude]);
    });
  }, [eventsWithCoords, mapBounds]);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

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
      toast.info("⏳ Los puntos se otorgarán cuando el organizador confirme tu asistencia.", { duration: 5000 });
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
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Eventos cerca de ti</h1>
            {locating && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Localizando…
              </span>
            )}
            {geoError && !userPos && (
              <Badge variant="secondary">Lima por defecto</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (!user) { toast.info("Debes iniciar sesión."); navigate("/auth"); }
              else navigate("/dashboard");
            }}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Inicio
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2 border-b border-border bg-card/80 flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Badge
            variant={activeFilter === "all" ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => setActiveFilter("all")}
          >
            Todos
          </Badge>
          {eventTypes.map((type) => (
            <Badge
              key={type}
              variant={activeFilter === type ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setActiveFilter(type)}
            >
              {TYPE_EMOJIS[type] ?? "📌"} {type}
            </Badge>
          ))}

          <div className="h-4 w-px bg-border mx-2" />
          
          <button
            onClick={() => setShowPastEvents(!showPastEvents)}
            className={`text-[11px] font-medium px-2 py-1 rounded-md shrink-0 transition-colors ${
              showPastEvents 
                ? "bg-amber-500/10 text-amber-600 border border-amber-200" 
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {showPastEvents ? "Ocultar pasados" : "Mostrar pasados"}
          </button>
        </div>

        {/* Map + Side Panel */}
        <div className="flex-1 flex relative">
          {/* ─── Mejora 4: Panel lateral sincronizado ─── */}
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="hidden md:flex flex-col border-r border-border bg-card overflow-hidden shrink-0"
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {visibleEvents.length} evento{visibleEvents.length !== 1 ? "s" : ""} en esta zona
                  </p>
                  <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {visibleEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-4">
                      No se ven eventos en esta zona. Mueve el mapa para buscar.
                    </p>
                  ) : (
                    <div className="space-y-1 p-2">
                      {visibleEvents.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => navigate(`/evento/${ev.id}`)}
                          className="w-full text-left p-3 rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-border"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{ev.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                              <p className="text-[11px] font-medium text-primary">
                                {ev.created_by ? (creatorNames[ev.created_by] || "Organizador") : "Organizador"}
                              </p>
                              <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <CalendarDays className="w-3 h-3" /> {ev.date}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {ev.schedule}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-3 h-3" /> {ev.location}
                              </p>
                            </div>
                            {joinedIds.has(ev.id) && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Panel toggle button (when collapsed) */}
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="hidden md:flex absolute top-4 left-4 z-[1000] bg-card/95 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-lg hover:bg-primary hover:text-primary-foreground transition-all items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="text-xs font-medium">{visibleEvents.length} eventos</span>
            </button>
          )}

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
              <MapBoundsTracker onBoundsChange={handleBoundsChange} />

              {/* Mejora 5: Buscador de lugares */}
              <PlaceSearch />

              {/* Mejora 3: Botón centrar en mí */}
              <RecenterButton userPos={userPos} />

              {/* User position */}
              {userPos && (
                <Marker position={userPos} icon={userIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold text-sm">📍 Tu ubicación</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Mejora 1: Marker Clustering + Mejora 2: Custom icons */}
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom
                showCoverageOnHover={false}
              >
                {eventsWithCoords.map((ev) => (
                  <Marker
                    key={ev.id}
                    position={[ev.latitude!, ev.longitude!]}
                    icon={createCategoryIcon(ev.type)}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <p className="font-bold text-sm">
                          {ev.emoji} {ev.title}
                        </p>
                        <p className="text-[11px] font-semibold text-primary mt-0.5">
                          Organizado por: {ev.created_by ? (creatorNames[ev.created_by] || "Cargando...") : "Organizador"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">{ev.description}</p>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </p>
                          <p className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {ev.date}
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
                          <div className="flex gap-1">
                            <ShareEvent title={ev.title} description={ev.description} eventId={ev.id} size="sm" variant="ghost" />
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${ev.latitude},${ev.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline py-1 px-2"
                            >
                              <ExternalLink className="w-3 h-3" /> Cómo llegar
                            </a>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>

            {/* Event count overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-md border border-border rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3"
            >
              <Navigation className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {eventsWithCoords.length} evento{eventsWithCoords.length !== 1 ? "s" : ""} disponible{eventsWithCoords.length !== 1 ? "s" : ""}
              </span>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventsMap;
