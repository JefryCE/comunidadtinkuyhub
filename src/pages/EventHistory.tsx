import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, History, Award, Filter, FileDown, Share2 } from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EventHistoryList, { type CompletedEvent } from "@/components/profile/EventHistoryList";
import EarnedBadgesGrid from "@/components/profile/EarnedBadgesGrid";
import ShareAchievement from "@/components/social/ShareAchievement";
import { badgeShareData, eventsShareData, hoursShareData, type ShareData } from "@/lib/socialShare";

const EVENT_TYPES = [
  { value: "all", label: "Todos los tipos" },
  { value: "Limpieza", label: "🌊 Limpieza" },
  { value: "Reforestación", label: "🌱 Reforestación" },
  { value: "Educación", label: "📚 Educación" },
  { value: "Social", label: "🤝 Social" },
  { value: "Salud", label: "❤️ Salud" },
  { value: "Animales", label: "🐾 Animales" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "attended", label: "✅ Asistió" },
  { value: "completed", label: "✅ Completado" },
  { value: "confirmed", label: "✅ Confirmado" },
  { value: "pending", label: "⏳ Pendiente" },
  { value: "no_show", label: "❌ No asistió" },
];

interface BadgeCatalog {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
}

const EventHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CompletedEvent[]>([]);
  const [badges, setBadges] = useState<BadgeCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Share states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeShareData, setActiveShareData] = useState<ShareData | null>(null);
  const [activeShareCard, setActiveShareCard] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Fetch event history
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Get registrations with event details
      const { data: regs } = await supabase
        .from("event_registrations" as any)
        .select("id, event_id, attendance_status, registered_at, events(id, title, emoji, type, color, date, location)")
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false });

      // 2. Get all badges
      const { data: allBadges } = await supabase
        .from("badges" as any)
        .select("*");

      if (regs) {
        const mapped: CompletedEvent[] = (regs as any[]).map((r) => ({
          id: r.id,
          event_id: r.event_id,
          attendance_status: r.attendance_status || "pending",
          registered_at: r.registered_at,
          event: r.events ?? {
            id: r.event_id,
            title: "Evento desconocido",
            emoji: "📌",
            type: "Social",
            color: "from-gray-400 to-gray-500",
            date: "—",
            location: "—",
          },
        }));
        setEvents(mapped);
      }

      if (allBadges) {
        setBadges(allBadges as any as BadgeCatalog[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Calculate which badges the user has earned
  const earnedBadges = useMemo(() => {
    const completedEvents = events.filter(
      (e) => e.attendance_status === "attended" || e.attendance_status === "completed" || e.attendance_status === "confirmed"
    );
    const completedCount = completedEvents.length;
    const types = new Set(completedEvents.map((e) => e.event.type));
    const ecoCount = completedEvents.filter((e) =>
      ["Limpieza", "Reforestación"].includes(e.event.type)
    ).length;
    const eduCount = completedEvents.filter((e) => e.event.type === "Educación").length;
    const socialCount = completedEvents.filter((e) =>
      ["Social", "Salud"].includes(e.event.type)
    ).length;

    return badges.map((badge) => {
      let earned = false;

      switch (badge.requirement_type) {
        case "events_completed":
          earned = completedCount >= badge.requirement_value;
          break;
        case "eco_events":
          earned = ecoCount >= badge.requirement_value;
          break;
        case "education_events":
          earned = eduCount >= badge.requirement_value;
          break;
        case "social_events":
          earned = socialCount >= badge.requirement_value;
          break;
        case "all_types":
          earned = types.size >= badge.requirement_value;
          break;
        case "streak":
          // Simplified: count consecutive attended events
          earned = completedCount >= badge.requirement_value;
          break;
        default:
          earned = false;
      }

      return {
        ...badge,
        earned,
        earned_at: earned ? new Date().toISOString() : undefined,
      };
    });
  }, [events, badges]);

  // Generate PDF certificate
  const exportPDF = () => {
    const completedEvents = events.filter(
      (e) => e.attendance_status === "attended" || e.attendance_status === "completed" || e.attendance_status === "confirmed"
    );
    const earnedCount = earnedBadges.filter((b) => b.earned).length;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const userName = user?.user_metadata?.full_name || user?.email || "Voluntario";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificado de Voluntariado - TinkuyHub</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: white; color: #1a1a2e; }
          .cert { max-width: 800px; margin: 40px auto; padding: 60px; border: 3px solid #e63a93; border-radius: 24px; position: relative; }
          .cert::before { content: ''; position: absolute; inset: 8px; border: 1px solid #e63a9333; border-radius: 20px; pointer-events: none; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #e63a93, #1e3a5f); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .subtitle { font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 3px; }
          .title { font-size: 32px; font-weight: 800; text-align: center; margin: 30px 0 10px; }
          .name { font-size: 28px; font-weight: 700; text-align: center; color: #e63a93; margin-bottom: 30px; }
          .stats { display: flex; justify-content: center; gap: 40px; margin: 30px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 36px; font-weight: 800; color: #e63a93; }
          .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .events-list { margin: 30px 0; }
          .events-list h3 { font-size: 14px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
          .event-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
          .event-emoji { font-size: 18px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .cert { border: 3px solid #e63a93; } }
        </style>
      </head>
      <body>
        <div class="cert">
          <div class="header">
            <div class="logo">TINKUYHUB</div>
            <div class="subtitle">Plataforma de Voluntariado Comunitario</div>
          </div>
          <div class="title">Certificado de Voluntariado</div>
          <div class="name">${userName}</div>
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${completedEvents.length}</div>
              <div class="stat-label">Eventos completados</div>
            </div>
            <div class="stat">
              <div class="stat-number">${earnedCount}</div>
              <div class="stat-label">Medallas obtenidas</div>
            </div>
          </div>
          <div class="events-list">
            <h3>Eventos participados</h3>
            ${completedEvents
              .map(
                (e) =>
                  `<div class="event-item"><span class="event-emoji">${e.event.emoji}</span><span><strong>${e.event.title}</strong> — ${e.event.date} · ${e.event.location}</span></div>`
              )
              .join("")}
          </div>
          <div class="footer">
            Certificado generado el ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })} · TinkuyHub
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const completedCount = events.filter(
    (e) => e.attendance_status === "attended" || e.attendance_status === "completed" || e.attendance_status === "confirmed"
  ).length;
  const earnedCount = earnedBadges.filter((b) => b.earned).length;
  const estimatedHours = completedCount * 3; // Approx 3 hours per event

  // Share handlers
  const handleShareBadge = (badge: any) => {
    const userName = user?.user_metadata?.full_name || "Un voluntario";
    setActiveShareData(badgeShareData(badge.name, badge.icon, userName, user?.id || ""));
    setActiveShareCard({
      icon: badge.icon,
      title: "¡Nueva Medalla!",
      subtitle: badge.name,
      stats: [{ label: "Requisito", value: badge.description }],
    });
    setShareModalOpen(true);
  };

  const handleShareEvents = () => {
    const userName = user?.user_metadata?.full_name || "Un voluntario";
    setActiveShareData(eventsShareData(completedCount, userName, user?.id || ""));
    setActiveShareCard({
      icon: "🎉",
      title: "Hito Desbloqueado",
      subtitle: "Eventos Completados",
      stats: [{ label: "Eventos", value: completedCount }],
    });
    setShareModalOpen(true);
  };

  const handleShareHours = () => {
    const userName = user?.user_metadata?.full_name || "Un voluntario";
    setActiveShareData(hoursShareData(estimatedHours, userName, user?.id || ""));
    setActiveShareCard({
      icon: "⏱️",
      title: "Impacto Generado",
      subtitle: "Tiempo invertido transformando la sociedad",
      stats: [{ label: "Horas comunitarias", value: estimatedHours }],
    });
    setShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Mi Historial</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedCount} eventos · {earnedCount} medallas
              </p>
            </div>
          </div>

          {completedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDF}
              className="gap-1.5 text-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              Certificado
            </Button>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { id: "registered", label: "Inscritos", value: events.length, icon: "📋" },
            { id: "completed", label: "Completados", value: completedCount, icon: "✅", onShare: completedCount > 0 ? handleShareEvents : undefined },
            { id: "hours", label: "Horas (Aprox)", value: estimatedHours, icon: "⏱️", onShare: estimatedHours > 0 ? handleShareHours : undefined },
            { id: "badges", label: "Medallas", value: earnedCount, icon: "🏅" },
          ].map((stat) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-card border border-border rounded-2xl p-4 text-center shadow-sm overflow-hidden"
            >
              <p className="text-2xl">{stat.icon}</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {stat.label}
              </p>

              {stat.onShare && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full hover:bg-primary/20 hover:text-primary transition-colors bg-background/50"
                    onClick={stat.onShare}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="history" className="gap-1.5 text-sm">
              <History className="w-4 h-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-1.5 text-sm">
              <Award className="w-4 h-4" />
              Medallas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Filter className="w-3.5 h-3.5" />
                Filtrar:
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <EventHistoryList
              events={events}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
            />
          </TabsContent>

          <TabsContent value="badges">
            <EarnedBadgesGrid badges={earnedBadges} onShare={handleShareBadge} />
          </TabsContent>
        </Tabs>

        {/* Share Modal */}
        {activeShareData && activeShareCard && (
          <ShareAchievement
            open={shareModalOpen}
            onOpenChange={setShareModalOpen}
            data={activeShareData}
            cardContent={activeShareCard}
          />
        )}
      </main>
    </div>
  );
};

export default EventHistory;
