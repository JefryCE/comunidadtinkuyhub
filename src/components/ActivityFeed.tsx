import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarPlus, UserPlus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Activity = {
  id: string;
  type: "event_created" | "registration" | "feedback";
  title: string;
  detail: string;
  time: string;
  emoji: string;
};

const ActivityFeed = () => {
  const query = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async (): Promise<Activity[]> => {
      const activities: Activity[] = [];

      // Recent events created
      const { data: events } = await supabase
        .from("events")
        .select("id, title, emoji, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      (events ?? []).forEach((e) => {
        activities.push({
          id: `ev-${e.id}`,
          type: "event_created",
          title: "Nuevo evento creado",
          detail: `${e.emoji} ${e.title}`,
          time: e.created_at,
          emoji: "📌",
        });
      });

      // Recent registrations (public count only)
      const { data: regs } = await supabase
        .from("event_registrations")
        .select("id, event_id, registered_at")
        .order("registered_at", { ascending: false })
        .limit(8);

      if (regs && regs.length > 0) {
        const eventIds = [...new Set(regs.map((r) => r.event_id))];
        const { data: regEvents } = await supabase
          .from("events")
          .select("id, title, emoji")
          .in("id", eventIds);

        const eventMap = new Map((regEvents ?? []).map((e) => [e.id, e]));

        regs.forEach((r) => {
          const ev = eventMap.get(r.event_id);
          if (ev) {
            activities.push({
              id: `reg-${r.id}`,
              type: "registration",
              title: "Nuevo voluntario inscrito",
              detail: `${ev.emoji} ${ev.title}`,
              time: r.registered_at,
              emoji: "🙋",
            });
          }
        });
      }

      // Recent feedback
      const { data: feedbacks } = await supabase
        .from("event_feedback")
        .select("id, event_id, rating, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (feedbacks && feedbacks.length > 0) {
        const fbEventIds = [...new Set(feedbacks.map((f) => f.event_id))];
        const { data: fbEvents } = await supabase
          .from("events")
          .select("id, title, emoji")
          .in("id", fbEventIds);

        const fbMap = new Map((fbEvents ?? []).map((e) => [e.id, e]));

        feedbacks.forEach((f) => {
          const ev = fbMap.get(f.event_id);
          if (ev) {
            activities.push({
              id: `fb-${f.id}`,
              type: "feedback",
              title: "Nueva reseña",
              detail: `${"⭐".repeat(f.rating)} en ${ev.emoji} ${ev.title}`,
              time: f.created_at,
              emoji: "💬",
            });
          }
        });
      }

      // Sort by time
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return activities.slice(0, 15);
    },
    refetchInterval: 30000,
  });

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "event_created": return <CalendarPlus className="w-4 h-4" />;
      case "registration": return <UserPlus className="w-4 h-4" />;
      case "feedback": return <Star className="w-4 h-4" />;
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  };

  const activities = query.data ?? [];

  return (
    <section className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Actividad reciente
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">
            Lo que está pasando
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Mira lo que la comunidad está haciendo en tiempo real.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aún no hay actividad.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-card transition-shadow"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(a.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{timeAgo(a.time)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ActivityFeed;
