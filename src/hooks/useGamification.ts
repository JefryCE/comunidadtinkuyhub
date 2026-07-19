import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GamificationStats, BADGES } from "@/lib/gamification";

export const useGamification = () => {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["gamification-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gamification_profiles" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as any | null;
    },
  });

  const badgesQuery = useQuery({
    queryKey: ["earned-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("earned_badges" as any)
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const regsQuery = useQuery({
    queryKey: ["gamification-regs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations" as any)
        .select("attendance_status, events(type)")
        .eq("user_id", user!.id);

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const completedRegs = (regsQuery.data ?? []).filter((r: any) =>
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

  const stats: GamificationStats | null = profileQuery.data
    ? {
        totalPoints: profileQuery.data.total_points ?? 0,
        eventsCompleted: profileQuery.data.events_completed ?? 0,
        currentStreak: profileQuery.data.current_streak ?? 0,
        longestStreak: profileQuery.data.longest_streak ?? 0,
        badgeIds: (badgesQuery.data ?? []).map((b: any) => b.badge_id),
        ecoCount,
        eduCount,
        socialCount,
        uniqueTypesCount: uniqueTypes.size,
      }
    : null;

  const earnedBadgeIds = new Set((badgesQuery.data ?? []).map((b: any) => b.badge_id));

  const allBadges = BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.has(badge.id),
    earnedAt: (badgesQuery.data ?? []).find((b: any) => b.badge_id === badge.id)?.earned_at,
  }));

  return {
    stats,
    allBadges,
    isLoading: profileQuery.isLoading || badgesQuery.isLoading || regsQuery.isLoading,
    refetch: () => {
      profileQuery.refetch();
      badgesQuery.refetch();
      regsQuery.refetch();
    },
  };
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // 1. Obtener los perfiles de gamificación ordenados por puntos
      const { data: gProfiles, error: gError } = await supabase
        .from("gamification_profiles" as any)
        .select("*")
        .order("total_points", { ascending: false })
        .limit(100); // Obtener suficientes para filtrar organizaciones después

      if (gError) throw gError;

      const userIds = (gProfiles ?? []).map((p: any) => p.user_id);
      if (userIds.length === 0) return [];

      // 2. Obtener la información del perfil público para filtrar y mostrar detalles
      const { data: userProfiles, error: uError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, account_type")
        .in("id", userIds);

      if (uError) throw uError;

      const profileMap = new Map((userProfiles ?? []).map((p) => [p.id, p]));

      // 3. Combinar y filtrar dejando solo voluntarios individuales con puntos > 0
      const volunteerProfiles = (gProfiles ?? [])
        .map((gp: any) => {
          const p = profileMap.get(gp.user_id);
          return {
            ...gp,
            profiles: p || null
          };
        })
        .filter((gp: any) => {
          // Solo mostrar si tienen puntos
          if (gp.total_points <= 0) return false;

          const profile = gp.profiles;
          if (!profile) return true; // por defecto voluntario
          const type = profile.account_type;
          return type === "persona_natural" || !type;
        });

      return volunteerProfiles.slice(0, 50).map((p: any, index: number) => ({
        rank: index + 1,
        userId: p.user_id,
        totalPoints: p.total_points,
        eventsCompleted: p.events_completed,
        currentStreak: p.current_streak,
        fullName: p.profiles?.full_name ?? "Voluntario",
        avatarUrl: p.profiles?.avatar_url ?? null,
      }));
    },
  });
};
