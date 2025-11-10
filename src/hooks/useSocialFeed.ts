import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

const POSTS_PER_PAGE = 10;

type FeedFilter = 'all' | 'rounds' | 'friends';
type SortBy = 'latest' | 'popular';

interface UseSocialFeedOptions {
  feedFilter?: FeedFilter;
  sortBy?: SortBy;
}

export function useSocialFeed({ feedFilter = 'all', sortBy = 'latest' }: UseSocialFeedOptions = {}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: [...queryKeys.social.feed(), feedFilter, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          ),
          rounds:round_id (
            id,
            date_played,
            total_score,
            course_id,
            courses:course_id (
              name,
              total_par
            )
          )
        `)
        .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1);

      if (feedFilter === 'rounds') {
        query = query.not('round_id', 'is', null);
      } else if (feedFilter === 'friends' && user) {
        const { data: friends } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friends?.map(f => f.friend_id) || [];
        if (friendIds.length > 0) {
          query = query.in('user_id', friendIds);
        } else {
          return [];
        }
      }

      if (sortBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const [userLikesData, holeScoresData] = await Promise.all([
        user ? 
          supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', data.map(p => p.id))
          : Promise.resolve({ data: [] }),
        
        (() => {
          const roundIds = data.filter(p => p.round_id).map(p => p.round_id);
          if (roundIds.length === 0) return Promise.resolve({ data: [] });
          
          return supabase
            .from('hole_scores')
            .select('round_id, strokes, putts, fairway_hit, green_in_regulation, holes!inner(par)')
            .in('round_id', roundIds);
        })()
      ]);

      const likedPostIds = new Set(userLikesData.data?.map(like => like.post_id) || []);
      const roundStatsMap = calculateRoundStats(holeScoresData.data || []);

      return data.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        roundStats: post.round_id ? roundStatsMap.get(post.round_id) : null,
      }));
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === POSTS_PER_PAGE ? pages.length : undefined;
    },
    enabled: !!user,
    initialPageParam: 0,
    staleTime: 30 * 1000,
  });
}

function calculateRoundStats(holeScores: any[]) {
  const statsMap = new Map();

  holeScores.forEach(hs => {
    if (!hs.strokes) return;

    const stats = statsMap.get(hs.round_id) || {
      totalPar: 0,
      totalPutts: 0,
      fairwaysHit: 0,
      fairwaysTotal: 0,
      girsHit: 0,
      total: 0,
      birdies: 0,
      eagles: 0,
    };

    const par = hs.holes?.par || 0;
    const scoreDiff = hs.strokes - par;

    stats.total += 1;
    stats.totalPar += par;
    stats.totalPutts += hs.putts || 0;

    if (par >= 4) {
      stats.fairwaysTotal += 1;
      if (hs.fairway_hit) stats.fairwaysHit += 1;
    }

    if (hs.green_in_regulation) stats.girsHit += 1;

    if (scoreDiff === -2) stats.eagles += 1;
    else if (scoreDiff === -1) stats.birdies += 1;

    statsMap.set(hs.round_id, stats);
  });

  return statsMap;
}
