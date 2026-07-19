import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  Building2,
  CalendarDays,
  CheckCircle2,
  BarChart3,
  Heart,
  Ban,
  Shield,
  Lock,
  ArrowUpRight,
  Trash2,
  MapPin,
  Clock,
  MailCheck,
  MailX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type BanInfo = {
  reason: string;
  created_at: string;
  banned_by: string | null;
};

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const queryClient = useQueryClient();
  const [blockDialogUserId, setBlockDialogUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch all profiles
  const profilesQuery = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const blockDialogUser = profilesQuery.data?.find(
    (p: any) => p.id === blockDialogUserId
  );

  // 2. Fetch all events
  const eventsQuery = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // 3. Fetch all registrations
  const regsQuery = useQuery({
    queryKey: ["admin-all-regs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // 4. Fetch all user bans
  const bansQuery = useQuery({
    queryKey: ["admin-all-bans"],
    enabled: isAdmin || isModerator,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("user_bans" as any)
          .select("*");
        if (error) {
          console.warn("No se pudieron cargar los bloqueos (es probable que la tabla 'user_bans' no exista aún en producción):", error);
          return [];
        }
        return data ?? [];
      } catch (err) {
        console.warn("Error al cargar user_bans:", err);
        return [];
      }
    },
  });

  // 5. Fetch all gamification profiles
  const gamificationProfilesQuery = useQuery({
    queryKey: ["admin-all-gamification-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_profiles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const profiles = profilesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const regs = regsQuery.data ?? [];
  const bans = bansQuery.data ?? [];

  const banMap = useMemo(() => {
    const map = new Map<string, BanInfo>();
    (bans as any[]).forEach((b: any) => {
      map.set(b.user_id, {
        reason: b.reason,
        created_at: b.created_at,
        banned_by: b.banned_by,
      });
    });
    return map;
  }, [bans]);

  const handleBlockUser = async () => {
    if (!blockDialogUserId || !banReason.trim()) return;
    try {
      const { error } = await supabase
        .from("user_bans" as any)
        .insert({
          user_id: blockDialogUserId,
          reason: banReason.trim(),
          banned_by: user!.id,
        } as any);
      if (error) throw error;
      toast.success("Usuario bloqueado");
      setBlockDialogUserId(null);
      setBanReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-all-bans"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al bloquear usuario");
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_bans" as any)
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Usuario desbloqueado");
      queryClient.invalidateQueries({ queryKey: ["admin-all-bans"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al desbloquear usuario");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Evento eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-regs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar el evento");
    }
  };

  const handleConfirmEmail = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("confirm_user_email" as any, { p_user_id: userId });
      if (error) throw error;
      toast.success("Correo confirmado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al confirmar correo");
    }
  };

  const handleResetPoints = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("gamification_profiles")
        .update({
          total_points: 0,
          events_completed: 0,
          current_streak: 0,
          longest_streak: 0,
          last_event_date: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq("user_id", userId);

      if (error) throw error;

      // Restablecer points_awarded a false en event_registrations para este usuario
      await supabase
        .from("event_registrations")
        .update({ points_awarded: false, points_awarded_amount: 0 })
        .eq("user_id", userId);

      toast.success("Puntos restablecidos a cero correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-all-gamification-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-regs"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al restablecer puntos");
    }
  };

  // --- Aggregate Stats for Volunteers ---
  const volunteerStats = useMemo(() => {
    const gProfiles = gamificationProfilesQuery.data ?? [];
    const gProfileMap = new Map(gProfiles.map((p: any) => [p.user_id, p]));

    return profiles
      .filter((p: any) => p.account_type === "persona_natural" || !p.account_type)
      .filter((p: any) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (p.full_name || "").toLowerCase().includes(term) ||
          (p.email || "").toLowerCase().includes(term) ||
          (p.phone || "").toLowerCase().includes(term)
        );
      })
      .map((p: any) => {
        const userRegs = regs.filter((r: any) => r.user_id === p.id);
        const attendances = userRegs.filter((r: any) => r.attendance_status === "confirmed").length;
        const gProf = gProfileMap.get(p.id);
        return {
          ...p,
          regCount: userRegs.length,
          attendanceCount: attendances,
          totalPoints: gProf?.total_points ?? 0,
        };
      });
  }, [profiles, regs, searchTerm, gamificationProfilesQuery.data]);

  // --- Aggregate Stats for Organizations ---
  const orgStats = useMemo(() => {
    return profiles
      .filter((p: any) => p.account_type === "ong" || p.account_type === "empresa")
      .filter((p: any) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (p.full_name || "").toLowerCase().includes(term) ||
          (p.organization_name || "").toLowerCase().includes(term) ||
          (p.business_name || "").toLowerCase().includes(term) ||
          (p.email || "").toLowerCase().includes(term) ||
          (p.phone || "").toLowerCase().includes(term)
        );
      })
      .map((p: any) => {
        const userEvents = events.filter((e: any) => e.created_by === p.id);
        const eventIds = userEvents.map((e: any) => e.id);
        const eventRegs = regs.filter((r: any) => eventIds.includes(r.event_id));
        const attendances = eventRegs.filter((r: any) => r.attendance_status === "confirmed").length;

        return {
          ...p,
          eventCount: userEvents.length,
          volRegCount: eventRegs.length,
          volAttendanceCount: attendances,
        };
      });
  }, [profiles, events, regs, searchTerm]);

  // --- Events enriched with organizer profile ---
  const eventsEnriched = useMemo(() => {
    return events.map((e: any) => {
      const organizer = profiles.find((p: any) => p.id === e.created_by);
      const eventRegs = regs.filter((r: any) => r.event_id === e.id);
      return {
        ...e,
        organizer,
        registrationCount: eventRegs.length,
        confirmedCount: eventRegs.filter((r: any) => r.attendance_status === "confirmed").length,
      };
    });
  }, [events, profiles, regs]);

  const isLoading =
    profilesQuery.isLoading ||
    eventsQuery.isLoading ||
    regsQuery.isLoading ||
    gamificationProfilesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderActionButtons = (profileId: string, isOrg: boolean = false) => {
    const ban = banMap.get(profileId);
    const profileLink = isOrg ? `/organizacion/${profileId}` : `/usuario/${profileId}`;

    if (!isAdmin && !isModerator) {
      return (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <Link to={profileLink}>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      );
    }

    if (ban) {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link to={profileLink}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Badge
            variant="outline"
            className="text-[10px] h-5 bg-red-50 text-red-600 border-red-200"
          >
            <Lock className="w-3 h-3 mr-1" /> Bloqueado
          </Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Desbloquear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desbloquear usuario?</AlertDialogTitle>
                <AlertDialogDescription>
                  El usuario podrá acceder nuevamente a todas las
                  funcionalidades de la plataforma.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleUnblockUser(profileId)}>
                  Desbloquear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
          <Link to={profileLink}>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => {
            setBlockDialogUserId(profileId);
            setBanReason("");
          }}
        >
          <Ban className="w-3 h-3 mr-1" /> Bloquear
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5 text-blue-500" />}
          label="Total Usuarios"
          value={profiles.length}
          trend={`${bans.length} bloqueados`}
        />
        <SummaryCard
          icon={<CalendarDays className="w-5 h-5 text-emerald-500" />}
          label="Total Eventos"
          value={events.length}
          trend="En plataforma"
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-amber-500" />}
          label="Inscripciones"
          value={regs.length}
          trend="Totales"
        />
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5 text-violet-500" />}
          label="Impacto"
          value={regs.filter((r: any) => r.attendance_status === "confirmed").length}
          trend="Asistencias"
        />
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card">
        <Tabs defaultValue="volunteers" className="w-full">
          <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Gestión de Cuentas
              </h2>
              <p className="text-sm text-muted-foreground">
                Monitorea la actividad de la comunidad.
              </p>
            </div>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="volunteers" className="gap-2">
                <Heart className="w-4 h-4" /> Voluntarios
              </TabsTrigger>
              <TabsTrigger value="organizations" className="gap-2">
                <Building2 className="w-4 h-4" /> Organizaciones
              </TabsTrigger>
              {(isAdmin || isModerator) && (
                <TabsTrigger value="events" className="gap-2">
                  <CalendarDays className="w-4 h-4" /> Eventos
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="px-6 pb-2 pt-2">
            <Input
              placeholder="Buscar voluntario, organización o empresa por nombre, correo o celular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-muted/20 border-border"
            />
          </div>

          <TabsContent value="volunteers" className="m-0">
            <div className="p-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          Usuario
                          {isAdmin && (
                            <Badge variant="outline" className="text-[9px] h-4 font-normal">
                              <Shield className="w-3 h-3 mr-0.5" />{" "}
                              {banMap.size} bloqueados
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Puntos</TableHead>
                      <TableHead className="text-center">Registros</TableHead>
                      <TableHead className="text-center">Asistencias</TableHead>
                      <TableHead className="text-center">Tasa Éxito</TableHead>
                      <TableHead className="text-center">Acción Puntos</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteerStats.map((v: any) => {
                      const ban = banMap.get(v.id);
                      return (
                        <TableRow
                          key={v.id}
                          className={`hover:bg-muted/10 transition-colors ${
                            ban ? "bg-red-50/30 dark:bg-red-950/10" : ""
                          }`}
                        >
                          <TableCell>
                            <Link
                              to={`/usuario/${v.id}`}
                              className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={v.avatar_url} />
                                <AvatarFallback>
                                  {(v.full_name || "U").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                    {v.full_name || "Sin nombre"}
                                  </p>
                                  {ban && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] h-4 leading-none uppercase px-1 bg-red-50 text-red-600 border-red-200"
                                    >
                                      Bloqueado
                                    </Badge>
                                  )}
                                  {!v.account_type && (
                                    <Badge
                                      variant="outline"
                                      className="text-[8px] h-3.5 leading-none uppercase px-1 bg-amber-50 text-amber-600 border-amber-200"
                                    >
                                      Admin / Sin Tipo
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.email || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{v.phone || "-"}</TableCell>
                          <TableCell className="text-center">
                            {v.email_confirmed ? (
                              <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
                                <MailCheck className="w-3 h-3 mr-1" /> Confirmado
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
                                  <MailX className="w-3 h-3 mr-1" /> Pendiente
                                </Badge>
                                {(isAdmin || isModerator) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleConfirmEmail(v.id)}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirmar
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                             <Badge variant="secondary" className="font-bold text-primary">
                               {v.totalPoints} pts
                             </Badge>
                           </TableCell>
                           <TableCell className="text-center font-semibold">
                             {v.regCount}
                           </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
                            >
                              {v.attendanceCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground font-medium">
                              {v.regCount > 0
                                ? Math.round((v.attendanceCount / v.regCount) * 100)
                                : 0}
                              %
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                             {(isAdmin || isModerator) && v.totalPoints > 0 ? (
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                   >
                                     Restablecer
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>¿Restablecer puntos a cero?</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Esta acción restablecerá todas las estadísticas del voluntario (puntos, racha y eventos completados) a cero.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={() => handleResetPoints(v.id)}
                                       className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                     >
                                       Confirmar
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             ) : (
                               <span className="text-xs text-muted-foreground">-</span>
                             )}
                           </TableCell>
                           <TableCell className="text-right">
                             {renderActionButtons(v.id, false)}
                           </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="organizations" className="m-0">
            <div className="p-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Organización / Empresa</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Eventos</TableHead>
                      <TableHead className="text-center">Inscritos</TableHead>
                      <TableHead className="text-center">Asistidos</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgStats.map((o: any) => {
                      const ban = banMap.get(o.id);
                      return (
                        <TableRow
                          key={o.id}
                          className={`hover:bg-muted/10 transition-colors ${
                            ban ? "bg-red-50/30 dark:bg-red-950/10" : ""
                          }`}
                        >
                          <TableCell>
                            <Link
                              to={`/organizacion/${o.id}`}
                              className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={o.avatar_url} />
                                <AvatarFallback>
                                  {(o.full_name || "O").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                    {o.full_name || "Sin nombre"}
                                  </p>
                                  {ban && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] h-4 leading-none uppercase px-1 bg-red-50 text-red-600 border-red-200"
                                    >
                                      Bloqueado
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] h-4 leading-none uppercase px-1"
                                  >
                                    {o.account_type}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.email || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.phone || "-"}</TableCell>
                          <TableCell className="text-center">
                            {o.email_confirmed ? (
                              <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
                                <MailCheck className="w-3 h-3 mr-1" /> Confirmado
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
                                  <MailX className="w-3 h-3 mr-1" /> Pendiente
                                </Badge>
                                {(isAdmin || isModerator) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleConfirmEmail(o.id)}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirmar
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {o.eventCount}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {o.volRegCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">
                            {o.volAttendanceCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderActionButtons(o.id, true)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          {/* Events Moderation Tab */}
          {(isAdmin || isModerator) && (
            <TabsContent value="events" className="m-0">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Moderación de Eventos</p>
                    <p className="text-xs text-muted-foreground">
                      Solo los administradores pueden eliminar eventos que incumplan las normas.
                    </p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-center">Fecha</TableHead>
                        <TableHead className="hidden md:table-cell">Organizador</TableHead>
                        <TableHead className="text-center">Inscritos</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventsEnriched.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                            No hay eventos registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        eventsEnriched
                          .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                          .map((ev: any) => (
                            <TableRow key={ev.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl select-none" aria-hidden>{ev.emoji}</span>
                                  <div>
                                    <Link
                                      to={`/evento/${ev.id}`}
                                      className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                                    >
                                      {ev.title}
                                    </Link>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="line-clamp-1">{ev.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-xs font-semibold text-foreground">
                                    {ev.date}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {ev.schedule}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {ev.organizer ? (
                                  <Link
                                    to={`/organizacion/${ev.organizer.id}`}
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={ev.organizer.avatar_url} />
                                      <AvatarFallback className="text-[10px]">
                                        {(ev.organizer.full_name || "O").slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-foreground font-medium line-clamp-1">
                                      {ev.organizer.full_name || "Sin nombre"}
                                    </span>
                                  </Link>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Sin organizador</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-semibold text-sm">{ev.registrationCount}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    de {ev.max_volunteers}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                    <Link to={`/evento/${ev.id}`}>
                                      <ArrowUpRight className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          <span className="font-semibold text-foreground">"{ev.title}"</span>
                                          {" "}será eliminado permanentemente junto con todas sus inscripciones ({ev.registrationCount} inscritos).
                                          Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-red-600 hover:bg-red-700 text-white"
                                          onClick={() => handleDeleteEvent(ev.id)}
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" /> Eliminar definitivamente
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Block dialog */}
      <Dialog
        open={!!blockDialogUserId}
        onOpenChange={(open) => {
          if (!open) {
            setBlockDialogUserId(null);
            setBanReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear usuario</DialogTitle>
            <DialogDescription>
              {blockDialogUser
                ? `Motivo del bloqueo para ${blockDialogUser.full_name || "este usuario"}:`
                : "Ingresa el motivo del bloqueo:"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="ban-reason">Motivo</Label>
            <Textarea
              id="ban-reason"
              placeholder="Describe el motivo del bloqueo..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockDialogUserId(null);
                setBanReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={!banReason.trim()}
            >
              <Lock className="w-4 h-4 mr-1" /> Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, trend }: any) => (
  <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="flex items-baseline justify-between">
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
      <span className="text-[10px] font-medium text-muted-foreground">{trend}</span>
    </div>
  </div>
);

export default AdminPanel;
