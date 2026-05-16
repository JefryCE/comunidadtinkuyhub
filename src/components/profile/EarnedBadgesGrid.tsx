import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned?: boolean;
  earned_at?: string;
}

interface EarnedBadgesGridProps {
  badges: BadgeInfo[];
  onShare?: (badge: BadgeInfo) => void;
}

const EarnedBadgesGrid = ({ badges, onShare }: EarnedBadgesGridProps) => {
  if (badges.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-3">🏅</p>
        <p className="font-semibold text-sm">Aún no tienes medallas</p>
        <p className="text-xs mt-1">Completa eventos para ganar recompensas</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
          className={`relative group rounded-2xl border p-4 text-center transition-all duration-300 ${
            badge.earned
              ? "bg-card border-primary/30 shadow-card hover:shadow-lg hover:-translate-y-1 cursor-default"
              : "bg-muted/30 border-border opacity-50 grayscale"
          }`}
        >
          {/* Glow on earned badges */}
          {badge.earned && (
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${badge.color} opacity-5 pointer-events-none`} />
          )}

          <div className="text-3xl sm:text-4xl mb-2 select-none">{badge.icon}</div>
          <p className="font-bold text-xs text-foreground leading-tight">{badge.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">{badge.description}</p>

          {badge.earned && badge.earned_at && (
            <p className="text-[9px] text-primary font-semibold mt-2 uppercase tracking-wider">
              {new Date(badge.earned_at).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}

          {!badge.earned && (
            <p className="text-[9px] text-muted-foreground mt-2 uppercase tracking-wider font-medium">
              Bloqueada
            </p>
          )}

          {badge.earned && onShare && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                onClick={() => onShare(badge)}
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default EarnedBadgesGrid;
