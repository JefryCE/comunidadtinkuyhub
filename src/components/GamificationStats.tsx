import { useGamification } from "@/hooks/useGamification";
import { getLevel, getNextLevel, getLevelProgress, BADGES } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Target, Zap } from "lucide-react";

const GamificationStats = () => {
  const { stats, allBadges, isLoading } = useGamification();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h2 className="text-xl font-bold text-card-foreground">Gamificación</h2>
        <p className="text-sm text-muted-foreground mt-2">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h2 className="text-xl font-bold text-card-foreground">Gamificación</h2>
        <p className="text-sm text-muted-foreground mt-2">
          ¡Únete a tu primer evento para empezar a ganar puntos! 🌱
        </p>
      </div>
    );
  }

  const level = getLevel(stats.totalPoints);
  const nextLevel = getNextLevel(stats.totalPoints);
  const progress = getLevelProgress(stats.totalPoints);

  return (
    <div className="space-y-6">
      {/* Level & Points */}
      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Tu nivel</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center text-3xl shadow-lg`}>
            {level.emoji}
          </div>
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-foreground">{level.name}</p>
            <p className="text-sm text-muted-foreground">{stats.totalPoints} puntos totales</p>
          </div>
        </div>

        {nextLevel && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{level.name}</span>
              <span>{nextLevel.name} ({nextLevel.minPoints} pts)</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {nextLevel.minPoints - stats.totalPoints} puntos para el siguiente nivel
            </p>
          </div>
        )}

        {!nextLevel && (
          <p className="text-sm text-primary font-medium">🏆 ¡Has alcanzado el nivel máximo!</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Puntos" value={stats.totalPoints} />
        <StatCard icon={<Target className="w-5 h-5" />} label="Eventos" value={stats.eventsCompleted} />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Racha actual" value={`${stats.currentStreak} sem`} />
        <StatCard icon={<Zap className="w-5 h-5" />} label="Mejor racha" value={`${stats.longestStreak} sem`} />
      </div>

      {/* Badges */}
      <div className="bg-card border border-border rounded-2xl shadow-card p-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4">
          Insignias ({allBadges.filter((b) => b.earned).length}/{allBadges.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allBadges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-xl border p-3 text-center transition-all ${
                badge.earned
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30 opacity-50 grayscale"
              }`}
            >
              <div className="text-3xl mb-1">{badge.emoji}</div>
              <p className="text-sm font-semibold text-foreground">{badge.name}</p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {badge.earned && badge.earnedAt && (
                <p className="text-[10px] text-primary mt-1">
                  ✓ {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className="bg-card border border-border rounded-xl p-4 text-center">
    <div className="flex justify-center text-primary mb-1">{icon}</div>
    <p className="text-2xl font-extrabold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default GamificationStats;
