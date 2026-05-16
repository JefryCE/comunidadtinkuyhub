import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Users, 
  Building2, 
  CalendarDays, 
  CheckCircle2, 
  ArrowUpRight, 
  BarChart3,
  Search,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

const AdminPanel = () => {
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

  const profiles = profilesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const regs = regsQuery.data ?? [];

  // --- Aggregate Stats for Volunteers ---
  const volunteerStats = useMemo(() => {
    return profiles
      .filter(p => p.account_type === "persona_natural" || !p.account_type)
      .map(p => {
        const userRegs = regs.filter(r => r.user_id === p.id);
        const attendances = userRegs.filter(r => r.attendance_status === "confirmed").length;
        return {
          ...p,
          regCount: userRegs.length,
          attendanceCount: attendances
        };
      });
  }, [profiles, regs]);

  // --- Aggregate Stats for Organizations ---
  const orgStats = useMemo(() => {
    return profiles
      .filter(p => p.account_type === "ong" || p.account_type === "empresa")
      .map(p => {
        const userEvents = events.filter(e => e.created_by === p.id);
        const eventIds = userEvents.map(e => e.id);
        const eventRegs = regs.filter(r => eventIds.includes(r.event_id));
        const attendances = eventRegs.filter(r => r.attendance_status === "confirmed").length;
        
        return {
          ...p,
          eventCount: userEvents.length,
          volRegCount: eventRegs.length,
          volAttendanceCount: attendances
        };
      });
  }, [profiles, events, regs]);

  const isLoading = profilesQuery.isLoading || eventsQuery.isLoading || regsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          icon={<Users className="w-5 h-5 text-blue-500" />}
          label="Total Usuarios"
          value={profiles.length}
          trend="+4 esta semana"
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
          value={regs.filter(r => r.attendance_status === 'confirmed').length}
          trend="Asistencias"
        />
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-card">
        <Tabs defaultValue="volunteers" className="w-full">
          <div className="px-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestión de Cuentas</h2>
              <p className="text-sm text-muted-foreground">Monitorea la actividad de la comunidad.</p>
            </div>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="volunteers" className="gap-2">
                <Heart className="w-4 h-4" /> Voluntarios
              </TabsTrigger>
              <TabsTrigger value="organizations" className="gap-2">
                <Building2 className="w-4 h-4" /> Organizaciones
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="volunteers" className="m-0">
            <div className="p-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-center">Registros</TableHead>
                      <TableHead className="text-center">Asistencias</TableHead>
                      <TableHead className="text-center">Tasa Éxito</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteerStats.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={v.avatar_url} />
                              <AvatarFallback>{(v.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-foreground">{v.full_name || 'Sin nombre'}</p>
                                {!v.account_type && (
                                  <Badge variant="outline" className="text-[8px] h-3.5 leading-none uppercase px-1 bg-amber-50 text-amber-600 border-amber-200">
                                    Admin / Sin Tipo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{(v as any).email || v.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{v.regCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
                            {v.attendanceCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-muted-foreground font-medium">
                            {v.regCount > 0 ? Math.round((v.attendanceCount / v.regCount) * 100) : 0}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                      <TableHead className="text-center">Eventos</TableHead>
                      <TableHead className="text-center">Inscritos</TableHead>
                      <TableHead className="text-center">Asistidos</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgStats.map((o) => (
                      <TableRow key={o.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={o.avatar_url} />
                              <AvatarFallback>{(o.full_name || 'O').slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-foreground">{o.full_name || 'Sin nombre'}</p>
                                    <Badge variant="outline" className="text-[9px] h-4 leading-none uppercase px-1">
                                        {o.account_type}
                                    </Badge>
                                </div>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{(o as any).email || o.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{o.eventCount}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {o.volRegCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-600">{o.volAttendanceCount}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, trend }: any) => (
  <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-muted/50">
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline justify-between">
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
      <span className="text-[10px] font-medium text-muted-foreground">{trend}</span>
    </div>
  </div>
);

export default AdminPanel;
