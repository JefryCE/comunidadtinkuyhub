import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Users,
  MapPin,
  Pencil,
  Trash2,
  Copy,
  ClipboardList,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import CreateEventDialog from "@/components/landing/CreateEventDialog";
import EditEventDialog from "@/components/EditEventDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
};

/** Try to parse the free-text date field into a real Date */
const parseDateLoose = (raw: string): Date | null => {
  // Try ISO first
  const iso = parseISO(raw);
  if (isValid(iso)) return iso;

  // Try Spanish-style "15 de Abril, 2026"
  const months: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  };
  const match = raw.match(/(\d{1,2})\s*de\s*(\w+),?\s*(\d{4})/i);
  if (match) {
    const day = Number(match[1]);
    const month = months[match[2].toLowerCase()];
    const year = Number(match[3]);
    if (month !== undefined) return new Date(year, month, day);
  }

  return null;
};

type ViewMode = "month" | "week" | "day";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { isModerator } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<"all" | "created" | "joined">("all");
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Fetch all events
  const eventsQuery = useQuery({
    queryKey: ["dashboard-events"],
    enabled: !!user,
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  // Fetch user registrations
  const regsQuery = useQuery({
    queryKey: ["dashboard-registrations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RegistrationRow[]> => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, user_id, registered_at");
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  const joinedEventIds = useMemo(() => new Set((regsQuery.data ?? []).map((r) => r.event_id)), [regsQuery.data]);

  // Only show events the user created or joined
  const myEvents = useMemo(() => {
    const all = eventsQuery.data ?? [];
    if (isModerator) return all; // Moderators see all events
    return all.filter((e) => e.created_by === user?.id || joinedEventIds.has(e.id));
  }, [eventsQuery.data, user?.id, joinedEventIds, isModerator]);

  const events = useMemo(() => {
    if (filter === "created") return myEvents.filter((e) => e.created_by === user?.id);
    if (filter === "joined") return myEvents.filter((e) => joinedEventIds.has(e.id));
    return myEvents;
  }, [myEvents, filter, user?.id, joinedEventIds]);

  // Build parsed date map
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    events.forEach((ev) => {
      const d = parseDateLoose(ev.date);
      if (d) {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    return map;
  }, [events]);

  // Navigation
  const goNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goPrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  // Days to render
  const days = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({
        start: startOfWeek(monthStart, { locale: es }),
        end: endOfWeek(monthEnd, { locale: es }),
      });
    }
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { locale: es });
      const weekEnd = endOfWeek(currentDate, { locale: es });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    return [currentDate];
  }, [viewMode, currentDate]);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { locale: es });
      const we = endOfWeek(currentDate, { locale: es });
      return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`;
    }
    return format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
  }, [viewMode, currentDate]);

  // Stats
  const createdCount = myEvents.filter((e) => e.created_by === user?.id).length;
  const joinedCount = myEvents.filter((e) => joinedEventIds.has(e.id)).length;
  const totalCount = myEvents.length;

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("🗑️ Evento eliminado");
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  const handleDuplicate = async (ev: EventRow) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("events").insert({
        title: `${ev.title} (copia)`,
        description: ev.description,
        type: ev.type,
        emoji: ev.emoji,
        color: ev.color,
        location: ev.location,
        date: ev.date,
        schedule: ev.schedule,
        requirements: ev.requirements,
        max_volunteers: ev.max_volunteers,
        created_by: user.id,
      } as any);
      if (error) throw error;
      toast.success("📋 Evento duplicado");
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al duplicar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Mi Dashboard</h1>
            <p className="text-muted-foreground mt-1">Gestiona y visualiza tus eventos.</p>
          </div>
          <div className="flex gap-2">
            <CreateEventDialog />
            <Button variant="outline" onClick={() => navigate("/")}>Inicio</Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-card"
          >
            <p className="text-sm text-muted-foreground">Creados por mí</p>
            <p className="text-3xl font-bold text-primary">{createdCount}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-card"
          >
            <p className="text-sm text-muted-foreground">Eventos unidos</p>
            <p className="text-3xl font-bold text-accent-foreground">{joinedCount}</p>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={goNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground capitalize ml-2">{headerLabel}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="created">Creados</TabsTrigger>
                <TabsTrigger value="joined">Unidos</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View mode */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="month"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
                <TabsTrigger value="week"><CalendarDays className="w-4 h-4" /></TabsTrigger>
                <TabsTrigger value="day"><List className="w-4 h-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Calendar grid */}
        {viewMode === "month" && (
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-3">
                  {d}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={key}
                    className={`min-h-[100px] border-b border-r border-border p-2 transition-colors ${
                      isCurrentMonth ? "bg-card" : "bg-muted/30"
                    } ${isToday ? "ring-2 ring-inset ring-primary/30" : ""}`}
                  >
                    <p className={`text-xs font-medium mb-1 ${
                      isToday ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] leading-tight rounded px-1.5 py-0.5 truncate font-medium bg-gradient-to-r ${ev.color} text-primary-foreground`}
                        >
                          {ev.emoji} {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week view */}
        {viewMode === "week" && (
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={key}
                    className={`min-h-[200px] border-r border-border p-3 ${isToday ? "ring-2 ring-inset ring-primary/30 bg-primary/5" : ""}`}
                  >
                    <p className={`text-xs font-semibold mb-1 capitalize ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {format(day, "EEE", { locale: es })}
                    </p>
                    <p className={`text-lg font-bold mb-3 ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </p>
                    <div className="space-y-2">
                      {dayEvents.map((ev) => (
                        <div key={ev.id} className="rounded-lg border border-border bg-background p-2">
                          <p className="text-xs font-semibold text-foreground truncate">{ev.emoji} {ev.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day view */}
        {viewMode === "day" && (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            {(() => {
              const key = format(currentDate, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key) ?? [];
              return dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No hay eventos para este día.
                </p>
              ) : (
                <div className="space-y-4">
                  {dayEvents.map((ev) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-4 rounded-xl border border-border bg-background p-4"
                    >
                      <div className={`w-2 h-full min-h-[48px] rounded-full bg-gradient-to-b ${ev.color}`} />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{ev.emoji} {ev.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>
                          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {ev.schedule}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ev.max_volunteers} voluntarios</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ev.created_by === user?.id && <Badge variant="secondary">Creado por mí</Badge>}
                          {joinedEventIds.has(ev.id) && <Badge variant="outline">Inscrito</Badge>}
                          {ev.created_by === user?.id && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/evento/${ev.id}/asistencia`)}>
                                <ClipboardList className="w-3 h-3 mr-1" /> Asistencia
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingEvent(ev)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDuplicate(ev)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {(ev.created_by === user?.id || isModerator) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminarán todas las inscripciones asociadas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteEvent(ev.id)}>Eliminar</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Events without parseable date (list below) */}
        {(() => {
          const unparsed = events.filter((ev) => !parseDateLoose(ev.date));
          if (unparsed.length === 0) return null;
          return (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-4">Eventos sin fecha exacta</h3>
              <div className="space-y-3">
                {unparsed.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{ev.emoji} {ev.title}</p>
                      <p className="text-sm text-muted-foreground">{ev.location} • {ev.date}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ev.created_by === user?.id && <Badge variant="secondary">Mío</Badge>}
                      {joinedEventIds.has(ev.id) && <Badge variant="outline">Inscrito</Badge>}
                      {ev.created_by === user?.id && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/evento/${ev.id}/asistencia`)}>
                            <ClipboardList className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingEvent(ev)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDuplicate(ev)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </main>

      {/* Edit dialog */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => { if (!open) setEditingEvent(null); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
