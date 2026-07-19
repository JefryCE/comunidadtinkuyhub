import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Users,
  MapPin,
  Pencil,
  Trash2,
  Copy,
  ClipboardList,
  Clock,
  Eye,
  Building2,
  TrendingUp,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import CreateEventDialog from "@/components/landing/CreateEventDialog";
import EditEventDialog from "@/components/EditEventDialog";
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

const OrgDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [searchParams, setSearchParams] = useSearchParams();
  const editingId = searchParams.get("edit");
  
  const setEditingEvent = (ev: EventRow | null) => {
    if (ev) {
      searchParams.set("edit", ev.id);
    } else {
      searchParams.delete("edit");
    }
    setSearchParams(searchParams);
  };

  // Fetch events
  const eventsQuery = useQuery({
    queryKey: ["org-dashboard-events"],
    enabled: !!user,
    queryFn: async (): Promise<EventRow[]> => {
      const query = supabase.from("events").select("*");

      // Moderators see all, others only their own
      if (!isModerator) {
        query.eq("created_by", user!.id);
      }

      const { data, error } = await query.order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  // Fetch all registrations for these events
  const regsQuery = useQuery({
    queryKey: ["org-registrations"],
    enabled: !!user,
    queryFn: async (): Promise<RegistrationRow[]> => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, user_id, registered_at");
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  const allEvents = eventsQuery.data ?? [];
  const today = new Date().toISOString().split("T")[0];

  const editingEvent = useMemo(() => {
    if (!editingId) return null;
    return allEvents.find(e => e.id === editingId) || null;
  }, [editingId, allEvents]);

  const events = useMemo(() => {
    if (filter === "upcoming") {
      return allEvents.filter((e) => e.date >= today);
    }
    return allEvents;
  }, [allEvents, filter, today]);

  // Count registrations per event
  const regCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (regsQuery.data ?? []).forEach((r) => {
      map.set(r.event_id, (map.get(r.event_id) ?? 0) + 1);
    });
    return map;
  }, [regsQuery.data]);

  // Stats
  const myCreatedEvents = allEvents.filter((e) => e.created_by === user?.id);
  const upcomingCreated = myCreatedEvents.filter((e) => e.date >= today);
  const totalVolunteers = myCreatedEvents.reduce(
    (acc, ev) => acc + (regCountMap.get(ev.id) ?? 0),
    0
  );
  const pastCreated = myCreatedEvents.filter((e) => e.date < today);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      toast.success("🗑️ Evento eliminado");
      queryClient.invalidateQueries({ queryKey: ["org-dashboard-events"] });
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
      queryClient.invalidateQueries({ queryKey: ["org-dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al duplicar");
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Panel de Organización
              </h2>
              <p className="text-sm text-muted-foreground">
                Gestiona tus eventos, revisa inscripciones y mide tu impacto
                social.
              </p>
            </div>
          </div>
          <CreateEventDialog />
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OrgStatCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="Eventos activos"
          value={upcomingCreated.length}
          color="text-blue-500"
        />
        <OrgStatCard
          icon={<Users className="w-5 h-5" />}
          label="Voluntarios totales"
          value={totalVolunteers}
          color="text-emerald-500"
        />
        <OrgStatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Eventos realizados"
          value={pastCreated.length}
          color="text-amber-500"
        />
        <OrgStatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total creados"
          value={myCreatedEvents.length}
          color="text-violet-500"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as any)}
        >
          <TabsList>
            <TabsTrigger value="upcoming">
              Próximos ({allEvents.filter((e) => e.date >= today).length})
            </TabsTrigger>
            <TabsTrigger value="all">
              Todos ({allEvents.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No tienes eventos aquí aún</p>
          <p className="text-sm mt-1">
            Crea tu primer evento para empezar a recibir voluntarios.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev, i) => {
            const regCount = regCountMap.get(ev.id) ?? 0;
            const isPast = ev.date < today;

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border border-border bg-card shadow-card overflow-hidden ${
                  isPast ? "opacity-60" : ""
                }`}
              >
                <div className="flex">
                  <div
                    className={`w-1.5 shrink-0 bg-gradient-to-b ${ev.color}`}
                  />
                  <div className="flex-1 p-4 sm:p-5">
                    {/* Top row */}
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
                        {isPast && (
                          <Badge variant="secondary">Finalizado</Badge>
                        )}
                        {ev.registration_open === false && (
                          <Badge
                            variant="destructive"
                            className="text-[10px]"
                          >
                            🔒 Cerrado
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
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

                    {/* Volunteer progress without limits */}
                    <div className="mt-3">
                      <div className="flex text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {regCount} {regCount === 1 ? 'voluntario inscrito' : 'voluntarios inscritos'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/evento/${ev.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingEvent(ev)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(`/evento/${ev.id}/asistencia`)
                        }
                      >
                        <ClipboardList className="w-3.5 h-3.5 mr-1" />{" "}
                        Asistencia
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(ev)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Duplicar
                      </Button>

                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar evento?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán
                                todas las inscripciones asociadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEvent(ev.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
};

const OrgStatCard = ({
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

export default OrgDashboard;
