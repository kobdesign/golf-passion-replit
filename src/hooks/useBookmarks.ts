import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/hooks/use-toast";

export function useBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bookmarksQuery = useQuery({
    queryKey: queryKeys.bookmarks.all(user?.id),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_bookmarks')
        .select('course_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(b => b.course_id);
    },
    enabled: !!user,
  });

  const addBookmarkMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('course_bookmarks')
        .insert({ user_id: user.id, course_id: courseId });

      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'bookmarks' || query.queryKey[0] === 'bookmark'
      });
      toast({
        title: "Bookmarked",
        description: "Course added to your bookmarks",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to bookmark course",
        variant: "destructive",
      });
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('course_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'bookmarks' || query.queryKey[0] === 'bookmark'
      });
      toast({
        title: "Removed",
        description: "Course removed from bookmarks",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    },
  });

  const isBookmarked = (courseId: string) => {
    return bookmarksQuery.data?.includes(courseId) || false;
  };

  const toggleBookmark = (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to bookmark courses.",
        variant: "destructive",
      });
      return;
    }
    
    if (isBookmarked(courseId)) {
      removeBookmarkMutation.mutate(courseId);
    } else {
      addBookmarkMutation.mutate(courseId);
    }
  };

  return {
    bookmarks: bookmarksQuery.data || [],
    isLoading: bookmarksQuery.isLoading,
    isBookmarked,
    toggleBookmark,
    addBookmark: addBookmarkMutation.mutate,
    removeBookmark: removeBookmarkMutation.mutate,
  };
}

export function useIsBookmarked(courseId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.bookmarks.check(user?.id || '', courseId),
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('course_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) {
        console.error('Error checking bookmark:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user && !!courseId,
  });
}
