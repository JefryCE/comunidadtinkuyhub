import { supabase } from "@/integrations/supabase/client";

// ─── POINTS ───
export const POINTS = {
  EVENT_JOIN: 50,
  EVENT_CREATE: 30,
  FIRST_EVENT: 100, // bonus
  STREAK_BONUS: 25, // per consecutive week
} as const;

// ─── LEVELS ───
export const LEVELS = [
  { name: "Semilla", emoji: "🌱", minPoints: 0, color: "from-emerald-400 to-green-500" },
  { name: "Brote", emoji: "🌿", minPoints: 100, color: "from-green-400 to-teal-500" },
  { name: "Árbol", emoji: "🌳", minPoints: 300, color: "from-teal-400 to-cyan-500" },
  { name: "Bosque", emoji: "🌲", minPoints: 600, color: "from-cyan-400 to-blue-500" },
  { name: "Guardián", emoji: "🛡️", minPoints: 1000, color: "from-blue-400 to-violet-500" },
  { name: "Leyenda", emoji: "⭐", minPoints: 2000, color: "from-violet-400 to-purple-500" },
] as const;

export const getLevel = (points: number) => {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
    else break;
  }
  return current;
};

export const getNextLevel = (points: number) => {
  for (const level of LEVELS) {
    if (points < level.minPoints) return level;
  }
  return null; // max level
};

export const getLevelProgress = (points: number) => {
  const current = getLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.round((progress / range) * 100);
};

// ─── BADGES ───
export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: GamificationStats) => boolean;
};

export type GamificationStats = {
  totalPoints: number;
  eventsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  badgeIds: string[];
};

export const BADGES: BadgeDef[] = [
  {
    id: "first_event",
    name: "Primer Paso",
    description: "Te uniste a tu primer evento",
    emoji: "🎉",
    condition: (s) => s.eventsCompleted >= 1,
  },
  {
    id: "five_events",
    name: "Comprometido",
    description: "Participaste en 5 eventos",
    emoji: "💪",
    condition: (s) => s.eventsCompleted >= 5,
  },
  {
    id: "ten_events",
    name: "Voluntario Estrella",
    description: "Participaste en 10 eventos",
    emoji: "⭐",
    condition: (s) => s.eventsCompleted >= 10,
  },
  {
    id: "twenty_events",
    name: "Héroe Comunitario",
    description: "Participaste en 20 eventos",
    emoji: "🦸",
    condition: (s) => s.eventsCompleted >= 20,
  },
  {
    id: "streak_3",
    name: "En Racha",
    description: "3 semanas consecutivas participando",
    emoji: "🔥",
    condition: (s) => s.longestStreak >= 3,
  },
  {
    id: "streak_8",
    name: "Imparable",
    description: "8 semanas consecutivas participando",
    emoji: "🚀",
    condition: (s) => s.longestStreak >= 8,
  },
  {
    id: "points_500",
    name: "Medio Millar",
    description: "Alcanzaste 500 puntos",
    emoji: "🏅",
    condition: (s) => s.totalPoints >= 500,
  },
  {
    id: "points_1000",
    name: "Club de los Mil",
    description: "Alcanzaste 1000 puntos",
    emoji: "🏆",
    condition: (s) => s.totalPoints >= 1000,
  },
  {
    id: "level_guardian",
    name: "Guardián del Planeta",
    description: "Alcanzaste el nivel Guardián",
    emoji: "🛡️",
    condition: (s) => s.totalPoints >= 1000,
  },
  {
    id: "level_legend",
    name: "Leyenda Viviente",
    description: "Alcanzaste el nivel Leyenda",
    emoji: "👑",
    condition: (s) => s.totalPoints >= 2000,
  },
];

// ─── GAMIFICATION LOGIC ───

export const ensureGamificationProfile = async (userId: string) => {
  const { data } = await supabase
    .from("gamification_profiles" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data as any;

  const { data: created, error } = await supabase
    .from("gamification_profiles" as any)
    .insert({ user_id: userId } as any)
    .select("*")
    .single();

  if (error) throw error;
  return created as any;
};

export const awardPointsForJoin = async (userId: string) => {
  const profile = await ensureGamificationProfile(userId);

  const isFirstEvent = profile.events_completed === 0;
  let pointsEarned = POINTS.EVENT_JOIN;
  if (isFirstEvent) pointsEarned += POINTS.FIRST_EVENT;

  // Calculate streak
  const today = new Date();
  const lastDate = profile.last_event_date ? new Date(profile.last_event_date) : null;
  let newStreak = 1;

  if (lastDate) {
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      newStreak = profile.current_streak + 1;
      pointsEarned += POINTS.STREAK_BONUS;
    }
  }

  const longestStreak = Math.max(newStreak, profile.longest_streak);

  const { error } = await supabase
    .from("gamification_profiles" as any)
    .update({
      total_points: profile.total_points + pointsEarned,
      events_completed: profile.events_completed + 1,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_event_date: today.toISOString().split("T")[0],
    } as any)
    .eq("user_id", userId);

  if (error) throw error;

  // Check and award new badges
  const stats: GamificationStats = {
    totalPoints: profile.total_points + pointsEarned,
    eventsCompleted: profile.events_completed + 1,
    currentStreak: newStreak,
    longestStreak,
    badgeIds: [],
  };

  // Fetch existing badges
  const { data: existingBadges } = await supabase
    .from("earned_badges" as any)
    .select("badge_id")
    .eq("user_id", userId);

  const earnedIds = new Set((existingBadges ?? []).map((b: any) => b.badge_id));
  const newBadges: string[] = [];

  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(stats)) {
      newBadges.push(badge.id);
    }
  }

  if (newBadges.length > 0) {
    await supabase.from("earned_badges" as any).insert(
      newBadges.map((badge_id) => ({ user_id: userId, badge_id })) as any
    );
  }

  return { pointsEarned, newBadges, stats };
};
