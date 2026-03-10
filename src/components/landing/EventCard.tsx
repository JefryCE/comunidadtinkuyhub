import { MapPin, Calendar, Clock, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareEvent from "@/components/ShareEvent";

type EventCardProps = {
  event: {
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
    created_by: string | null;
    registration_open?: boolean;
  };
  creatorName: string;
  joining: boolean;
  onJoin: () => void;
  onViewDetails: () => void;
  distanceKm?: number | null;
};

const EventCard = ({ event, creatorName, joining, onJoin, onViewDetails, distanceKm }: EventCardProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-hero transition-all duration-300 group h-full">
      <div className={`h-2 bg-gradient-to-r ${event.color}`} />
      <div className="p-6 flex flex-col h-[calc(100%-0.5rem)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{event.emoji}</span>
          <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">
            {event.type}
          </span>
          {distanceKm != null && (
            <span className="text-xs text-muted-foreground ml-auto">
              📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="space-y-2 mb-5 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{event.schedule}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4 shrink-0" />
            <span>{creatorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 shrink-0" />
            <span>{event.max_volunteers} voluntarios máx.</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails}>
            Ver detalles
          </Button>
          <Button
            className="flex-1 gradient-cta text-primary-foreground border-0 hover:opacity-90"
            size="sm"
            disabled={joining || event.registration_open === false}
            onClick={onJoin}
          >
            {event.registration_open === false ? "🔒 Cerrado" : joining ? "Inscribiendo..." : "Unirme"}
          </Button>
          <ShareEvent title={event.title} description={event.description} eventId={event.id} size="icon" variant="ghost" />
        </div>
      </div>
    </div>
  );
};

export default EventCard;
