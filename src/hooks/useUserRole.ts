import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as string);
    },
  });

  return {
    isModerator: roles.includes("moderator") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    roles,
  };
};
