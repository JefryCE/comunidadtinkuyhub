import { motion } from "framer-motion";
import { Calendar, MapPin, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export interface CompletedEvent {
  id: string;
  event_id: string;
  attendance_status: string;
  registered_at: string;
  event: {
    id: string;
    title: string;
    emoji: string;
    type: string;
    color: string;
    date: string;
    location: string;
  };
}

interface EventHistoryListProps {
  events: CompletedEvent[];
  typeFilter: string;
  statusFilter: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  attended: {
    label: "Asistió",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  completed: {
    label: "Completado",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  confirmed: {
    label: "Confirmado",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
  },
  pending: {
    label: "Pendiente",
    icon: <Clock className="w-3.5 h-3.5" />,
    className: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800",
  },
  no_show: {
    label: "No asistió",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
  },
};

const EventHistoryList = ({ events, typeFilter, statusFilter }: EventHistoryListProps) => {
  const navigate = useNavigate();

  const filtered = events.filter((e) => {
    if (typeFilter && typeFilter !== "all" && e.event.type !== typeFilter) return false;
    if (statusFilter && statusFilter !== "all" && e.attendance_status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-semibold text-sm">No hay eventos en tu historial</p>
        <p className="text-xs mt-1">Inscríbete a eventos para que aparezcan aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((reg, i) => {
        const status = statusConfig[reg.attendance_status] || statusConfig.pending;
        return (
          <motion.div
            key={reg.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card border border-border rounded-2xl p-4 hover:shadow-card transition-all duration-300 group"
          >
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${reg.event.color} flex items-center justify-center text-lg shrink-0 shadow-sm`}>
                {reg.event.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-foreground leading-tight">{reg.event.title}</p>
                  <Badge variant="outline" className={`text-[9px] h-5 px-1.5 ${status.className}`}>
                    <span className="mr-1">{status.icon}</span>
                    {status.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {reg.event.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {reg.event.location}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/evento/${reg.event_id}`)}
                className="text-[10px] text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Ver
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default EventHistoryList;
