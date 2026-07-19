import { supabase } from "@/integrations/supabase/client";
import { parseSpanishDate } from "@/lib/utils";

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
  { name: "Brote", emoji: "🌿", minPoints: 300, color: "from-green-400 to-teal-500" },
  { name: "Árbol", emoji: "🌳", minPoints: 900, color: "from-teal-400 to-cyan-500" },
  { name: "Bosque", emoji: "🌲", minPoints: 1800, color: "from-cyan-400 to-blue-500" },
  { name: "Guardián", emoji: "🛡️", minPoints: 3000, color: "from-blue-400 to-violet-500" },
  { name: "Leyenda", emoji: "⭐", minPoints: 6000, color: "from-violet-400 to-purple-500" },
] as const;

export const getLevel = (points: number): typeof LEVELS[number] => {
  let current: typeof LEVELS[number] = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.minPoints) current = level;
    else break;
  }
  return current;
};

export const getNextLevel = (points: number): typeof LEVELS[number] | null => {
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
  ecoCount: number;
  eduCount: number;
  socialCount: number;
  uniqueTypesCount: number;
};

export const BADGES: BadgeDef[] = [
  {
    id: "first_event",
    name: "Primer Paso",
    description: "Completaste tu primer evento de voluntariado",
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
    id: "eco_3",
    name: "Amigo del Planeta",
    description: "Completaste 3 eventos ecológicos (limpieza o reforestación)",
    emoji: "🌍",
    condition: (s) => s.ecoCount >= 3,
  },
  {
    id: "eco_5",
    name: "Guardián del Planeta",
    description: "Completaste 5 eventos ecológicos",
    emoji: "🌿",
    condition: (s) => s.ecoCount >= 5,
  },
  {
    id: "edu_1",
    name: "Primera Enseñanza",
    description: "Completaste tu primer evento educativo",
    emoji: "📖",
    condition: (s) => s.eduCount >= 1,
  },
  {
    id: "edu_3",
    name: "Educador Voluntario",
    description: "Completaste 3 eventos educativos",
    emoji: "🎓",
    condition: (s) => s.eduCount >= 3,
  },
  {
    id: "social_3",
    name: "Corazón Solidario",
    description: "Completaste 3 eventos sociales o de salud",
    emoji: "❤️",
    condition: (s) => s.socialCount >= 3,
  },
  {
    id: "all_types_4",
    name: "Multifacético",
    description: "Participaste en 4 tipos distintos de eventos",
    emoji: "🌈",
    condition: (s) => s.uniqueTypesCount >= 4,
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
    name: "Líder Guardián",
    description: "Alcanzaste el nivel Guardián",
    emoji: "🛡️",
    condition: (s) => s.totalPoints >= 3000,
  },
  {
    id: "level_legend",
    name: "Leyenda Viviente",
    description: "Alcanzaste el nivel Leyenda",
    emoji: "👑",
    condition: (s) => s.totalPoints >= 6000,
  },
];

// ─── DATE HELPERS ───

export const parseToLocalDate = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  // Try YYYY-MM-DD
  const parts = dateInput.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  // Try Spanish format
  const spanishParsed = parseSpanishDate(dateInput);
  if (spanishParsed) {
    return new Date(spanishParsed.getFullYear(), spanishParsed.getMonth(), spanishParsed.getDate());
  }

  // Fallback
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date();
};

export const getMonday = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// ─── GAMIFICATION LOGIC ───

type GamificationProfile = {
  user_id: string;
  total_points: number;
  events_completed: number;
  current_streak: number;
  longest_streak: number;
  last_event_date: string | null;
};

const ensureGamificationProfile = async (userId: string): Promise<GamificationProfile> => {
  const { data } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle() as any;

  if (data) return data as GamificationProfile;

  const { data: created, error } = await supabase
    .from("gamification_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single() as any;

  if (error) throw error;
  return created as GamificationProfile;
};

export const getGamificationStats = async (userId: string, profile: GamificationProfile): Promise<GamificationStats> => {
  const { data: allRegistrations } = await supabase
    .from("event_registrations")
    .select("attendance_status, events(type)")
    .eq("user_id", userId) as any;

  const completedRegs = (allRegistrations ?? []).filter((r: any) =>
    r.attendance_status === "attended" ||
    r.attendance_status === "completed" ||
    r.attendance_status === "confirmed"
  );

  const ecoCount = completedRegs.filter((r: any) =>
    ["Limpieza", "Reforestación"].includes(r.events?.type)
  ).length;

  const eduCount = completedRegs.filter((r: any) =>
    r.events?.type === "Educación"
  ).length;

  const socialCount = completedRegs.filter((r: any) =>
    ["Social", "Salud"].includes(r.events?.type)
  ).length;

  const uniqueTypes = new Set(completedRegs.map((r: any) => r.events?.type).filter(Boolean));

  return {
    totalPoints: profile.total_points,
    eventsCompleted: profile.events_completed,
    currentStreak: profile.current_streak,
    longestStreak: profile.longest_streak,
    badgeIds: [],
    ecoCount,
    eduCount,
    socialCount,
    uniqueTypesCount: uniqueTypes.size,
  };
};

export const checkAndAwardBadges = async (userId: string, stats: GamificationStats) => {
  const { data: existingBadges } = await supabase
    .from("earned_badges")
    .select("badge_id")
    .eq("user_id", userId) as any;

  const earnedIds = new Set((existingBadges ?? []).map((b: any) => b.badge_id));
  const newBadges: string[] = [];

  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(stats)) {
      newBadges.push(badge.id);
    }
  }

  if (newBadges.length > 0) {
    await supabase.from("earned_badges").insert(
      newBadges.map((badge_id) => ({ user_id: userId, badge_id }))
    ) as any;
  }

  return newBadges;
};

const _processingClaims = new Set<string>();

export const awardPointsForJoin = async (userId: string, eventDateStr?: string) => {
  const profile = await ensureGamificationProfile(userId);

  const isFirstEvent = profile.events_completed === 0;
  let pointsEarned = POINTS.EVENT_JOIN;
  if (isFirstEvent) pointsEarned += POINTS.FIRST_EVENT;

  // Calculate streak based on event date
  const eventDate = eventDateStr ? parseToLocalDate(eventDateStr) : new Date();
  const eventDateStrYYYYMMDD = eventDate.toISOString().split("T")[0];

  const lastDateStr = profile.last_event_date;
  let newStreak = profile.current_streak;
  let longestStreak = profile.longest_streak;
  let updatedLastEventDate = profile.last_event_date;

  if (!lastDateStr) {
    newStreak = 1;
    longestStreak = Math.max(1, longestStreak);
    updatedLastEventDate = eventDateStrYYYYMMDD;
  } else {
    const lastEventDate = parseToLocalDate(lastDateStr);
    const currentEventMonday = getMonday(eventDate);
    const lastEventMonday = getMonday(lastEventDate);

    const diffMs = currentEventMonday.getTime() - lastEventMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    if (diffWeeks === 1) {
      newStreak = profile.current_streak + 1;
      pointsEarned += POINTS.STREAK_BONUS;
      longestStreak = Math.max(newStreak, longestStreak);
      updatedLastEventDate = eventDateStrYYYYMMDD;
    } else if (diffWeeks > 1) {
      newStreak = 1;
      updatedLastEventDate = eventDateStrYYYYMMDD;
    } else if (diffWeeks === 0) {
      const diffDays = Math.floor((eventDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        updatedLastEventDate = eventDateStrYYYYMMDD;
      }
    }
  }

  const updatedProfile = {
    total_points: profile.total_points + pointsEarned,
    events_completed: profile.events_completed + 1,
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_event_date: updatedLastEventDate,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("gamification_profiles")
    .update(updatedProfile as any)
    .eq("user_id", userId);

  if (error) throw error;

  const stats = await getGamificationStats(userId, {
    ...profile,
    ...updatedProfile,
    user_id: userId
  });

  const newBadges = await checkAndAwardBadges(userId, stats);

  return { pointsEarned, newBadges, stats };
};

export const confirmAttendance = async (registrationId: string, volunteerId: string) => {
  const { error } = await supabase.rpc("confirm_attendance_and_award" as any, {
    p_registration_id: registrationId,
    p_volunteer_id: volunteerId
  });

  if (error) throw error;
};

export const claimPendingPoints = async (userId: string) => {
  // Buscar eventos confirmados pero sin puntos entregados, incluyendo la fecha del evento
  const { data: pendingClaims, error } = await supabase
    .from("event_registrations")
    .select("id, events(date)")
    .eq("user_id", userId)
    .eq("attendance_status", "confirmed")
    .eq("points_awarded", false) as any;

  if (error || !pendingClaims || pendingClaims.length === 0) return { newPoints: 0, newBadges: [] };

  // Ordenar cronológicamente por la fecha del evento
  const sortedClaims = [...pendingClaims].sort((a: any, b: any) => {
    const dateA = a.events?.date ? parseToLocalDate(a.events.date) : new Date(0);
    const dateB = b.events?.date ? parseToLocalDate(b.events.date) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  let totalPoints = 0;
  const allNewBadges: string[] = [];

  for (const claim of sortedClaims) {
    if (_processingClaims.has(claim.id)) continue;
    _processingClaims.add(claim.id);

    const { data: updated } = await supabase
      .from("event_registrations")
      .update({ points_awarded: true })
      .eq("id", claim.id)
      .eq("points_awarded", false)
      .select("id")
      .single() as any;

    if (!updated) continue;

    const result = await awardPointsForJoin(userId, claim.events?.date);
    totalPoints += result.pointsEarned;
    allNewBadges.push(...result.newBadges);
  }

  return { newPoints: totalPoints, newBadges: allNewBadges };
};

export const awardPointsForCreate = async (userId: string) => {
  const profile = await ensureGamificationProfile(userId);

  const updatedProfile = {
    total_points: profile.total_points + POINTS.EVENT_CREATE,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("gamification_profiles")
    .update(updatedProfile as any)
    .eq("user_id", userId);

  if (error) throw error;

  const stats = await getGamificationStats(userId, {
    ...profile,
    ...updatedProfile,
    user_id: userId
  });

  const newBadges = await checkAndAwardBadges(userId, stats);

  return { pointsEarned: POINTS.EVENT_CREATE, newBadges, stats };
};

export const markNoShow = async (registrationId: string) => {
  const { error } = await supabase
    .from("event_registrations")
    .update({ attendance_status: "no_show" })
    .eq("id", registrationId);

  if (error) throw error;
};

export const resetAttendance = async (registrationId: string, volunteerId: string) => {
  const { error } = await supabase.rpc("reset_attendance_and_deduct" as any, {
    p_registration_id: registrationId,
    p_volunteer_id: volunteerId
  });

  if (error) throw error;
};
