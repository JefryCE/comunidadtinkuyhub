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

  const stats: GamificationStats | null = profileQuery.data
    ? {
        totalPoints: profileQuery.data.total_points ?? 0,
        eventsCompleted: profileQuery.data.events_completed ?? 0,
        currentStreak: profileQuery.data.current_streak ?? 0,
        longestStreak: profileQuery.data.longest_streak ?? 0,
        badgeIds: (badgesQuery.data ?? []).map((b: any) => b.badge_id),
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
    isLoading: profileQuery.isLoading || badgesQuery.isLoading,
    refetch: () => {
      profileQuery.refetch();
      badgesQuery.refetch();
    },
  };
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("gamification_profiles" as any)
        .select("*")
        .order("total_points", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = (profiles ?? []).map((p: any) => p.user_id);
      if (userIds.length === 0) return [];

      const { data: userProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((userProfiles ?? []).map((p) => [p.id, p]));

      return (profiles ?? []).map((p: any, index: number) => ({
        rank: index + 1,
        userId: p.user_id,
        totalPoints: p.total_points,
        eventsCompleted: p.events_completed,
        currentStreak: p.current_streak,
        fullName: profileMap.get(p.user_id)?.full_name ?? "Voluntario",
        avatarUrl: profileMap.get(p.user_id)?.avatar_url ?? null,
      }));
    },
  });
};
