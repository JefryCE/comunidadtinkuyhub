import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Medal, Flame, ArrowLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaderboard } from "@/hooks/useGamification";
import { getLevel } from "@/lib/gamification";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const { data: leaders, isLoading } = useLeaderboard();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              Ranking
            </h1>
            <p className="text-muted-foreground mt-1">Los voluntarios más activos de la comunidad</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando ranking...</div>
        ) : !leaders || leaders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Aún no hay voluntarios en el ranking.</p>
            <p className="text-sm text-muted-foreground mt-1">¡Únete a un evento para ser el primero!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 podium */}
            {leaders.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[leaders[1], leaders[0], leaders[2]].map((leader, idx) => {
                  const level = getLevel(leader.totalPoints);
                  const isFirst = idx === 1;
                  return (
                    <motion.div
                      key={leader.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`bg-card border border-border rounded-2xl p-4 text-center ${
                        isFirst ? "ring-2 ring-primary/30 shadow-lg -mt-4" : ""
                      }`}
                    >
                      <div className="flex justify-center mb-2">
                        {getRankIcon(leader.rank)}
                      </div>
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarImage src={leader.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{getInitials(leader.fullName)}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-sm text-foreground truncate">{leader.fullName}</p>
                      <p className="text-xs text-muted-foreground">{level.emoji} {level.name}</p>
                      <p className="text-lg font-extrabold text-primary mt-1">{leader.totalPoints}</p>
                      <p className="text-[10px] text-muted-foreground">puntos</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Rest of the leaderboard */}
            {leaders.slice(leaders.length >= 3 ? 3 : 0).map((leader, idx) => {
              const level = getLevel(leader.totalPoints);
              return (
                <motion.div
                  key={leader.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl p-4"
                >
                  <div className="w-8 flex justify-center">{getRankIcon(leader.rank)}</div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={leader.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(leader.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{leader.fullName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{level.emoji} {level.name}</span>
                      <span>•</span>
                      <span>{leader.eventsCompleted} eventos</span>
                      {leader.currentStreak > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-orange-500" /> {leader.currentStreak}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-primary">{leader.totalPoints}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
