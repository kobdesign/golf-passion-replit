import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.userRole(user?.id),
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role || 'user';
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.isAdmin(user?.id),
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return data || false;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}
