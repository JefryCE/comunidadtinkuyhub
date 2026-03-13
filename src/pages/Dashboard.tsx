import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

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

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { isModerator } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"all" | "created" | "joined">("all");
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const eventsQuery = useQuery({
    queryKey: ["dashboard-events"],
    enabled: !!user,
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

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

  const myEvents = useMemo(() => {
    const all = eventsQuery.data ?? [];
    if (isModerator) return all;
    return all.filter((e) => e.created_by === user?.id || joinedEventIds.has(e.id));
  }, [eventsQuery.data, user?.id, joinedEventIds, isModerator]);

  const events = useMemo(() => {
    if (filter === "created") return myEvents.filter((e) => e.created_by === user?.id);
    if (filter === "joined") return myEvents.filter((e) => joinedEventIds.has(e.id));
    return myEvents;
  }, [myEvents, filter, user?.id, joinedEventIds]);

  const createdCount = myEvents.filter((e) => e.created_by === user?.id).length;
  const joinedCount = myEvents.filter((e) => joinedEventIds.has(e.id)).length;

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

  const isCreator = (ev: EventRow) => ev.created_by === user?.id;
  const isJoined = (ev: EventRow) => joinedEventIds.has(ev.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
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

        {/* Filter tabs */}
        <div className="mb-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({myEvents.length})</TabsTrigger>
              <TabsTrigger value="created">Creados ({createdCount})</TabsTrigger>
              <TabsTrigger value="joined">Inscritos ({joinedCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Event list */}
        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No tienes eventos aquí aún</p>
            <p className="text-sm mt-1">Crea un evento o inscríbete a uno para verlo aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
              >
                {/* Color bar + content */}
                <div className="flex">
                  <div className={`w-1.5 shrink-0 bg-gradient-to-b ${ev.color}`} />
                  <div className="flex-1 p-4 sm:p-5">
                    {/* Top row: title + badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base sm:text-lg truncate">
                          {ev.emoji} {ev.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isCreator(ev) && <Badge variant="secondary">Creado por mí</Badge>}
                        {isJoined(ev) && <Badge variant="outline">Inscrito</Badge>}
                        {ev.registration_open === false && (
                          <Badge variant="destructive" className="text-[10px]">🔒 Cerrado</Badge>
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
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Máx. {ev.max_volunteers}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/evento/${ev.id}`)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                      </Button>

                      {isCreator(ev) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingEvent(ev)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/evento/${ev.id}/asistencia`)}>
                            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Asistencia
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDuplicate(ev)}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Duplicar
                          </Button>
                        </>
                      )}

                      {isModerator && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
