import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

interface RoundHistoryItem {
  id: string;
  date: string;
  courseName: string;
  courseId: string;
  score: number;
  par: number;
  toPar: string;
}

export function useRoundHistory(courseId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.rounds.history(user?.id, courseId),
    queryFn: async (): Promise<RoundHistoryItem[]> => {
      if (!user) return [];

      let query = supabase
        .from('rounds')
        .select(`
          id,
          date_played,
          total_score,
          courses (
            id,
            name,
            total_par
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_played', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((round: any) => ({
        id: round.id,
        date: round.date_played,
        courseName: round.courses?.name || 'Unknown Course',
        courseId: round.courses?.id || '',
        score: round.total_score || 0,
        par: round.courses?.total_par || 72,
        toPar: calculateToPar(round.total_score || 0, round.courses?.total_par || 72),
      }));
    },
    enabled: !!user,
  });
}

export function useActiveRound() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.rounds.active(user?.id),
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('rounds')
        .select(`
          *,
          courses (
            id,
            name,
            total_par,
            total_holes
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active round:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });
}

function calculateToPar(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}
