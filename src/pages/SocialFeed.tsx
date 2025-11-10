import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  MessageCircle, 
  Bell, 
  Mail, 
  Plus,
  Trophy,
  Maximize2,
  TrendingUp,
  Users,
  Target,
  Award
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import PostComments from "@/components/PostComments";
import PostActions from "@/components/PostActions";
import PostImageGrid from "@/components/PostImageGrid";
import ImageLightbox from "@/components/ImageLightbox";
import RoundSummaryDialog from "@/components/RoundSummaryDialog";
import PostCardSkeleton from "@/components/skeletons/PostCardSkeleton";
import { useToast } from "@/hooks/use-toast";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { calculateVsPar, getVsParValue } from "@/lib/courseUtils";
import { queryKeys } from "@/lib/queryKeys";

const SocialFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPostForComments, setSelectedPostForComments] = useState<{
    postId: string;
    postUserId: string;
  } | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedRoundForDialog, setSelectedRoundForDialog] = useState<{
    roundId: string;
    courseId: string;
  } | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends' | 'rounds'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());

  // Fetch posts with infinite scroll using the useSocialFeed hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useSocialFeed({ feedFilter, sortBy });

  const posts = data?.pages.flat() || [];

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async ({ postId, isLiked, postUserId }: { postId: string; isLiked: boolean; postUserId: string }) => {
      if (!user) throw new Error('Not authenticated');

      console.log('[Like] Starting mutation:', { postId, isLiked, postUserId });

      if (isLiked) {
        // Currently liked - remove it (unlike)
        console.log('[Like] Deleting like...');
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('[Like] Delete error:', deleteError);
          throw deleteError;
        }

        await supabase.rpc('decrement_likes_count', { post_id: postId });
        console.log('[Like] Unlike successful');
      } else {
        // Currently not liked - add it (like)
        console.log('[Like] Inserting like...');
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });

        // Handle race condition - check for duplicate key violations
        if (insertError) {
          console.error('[Like] Insert error:', insertError);
          
          // Check for duplicate key error (PostgreSQL error code 23505)
          // Supabase might return it as error.code or in error.message
          const isDuplicate = 
            insertError.code === '23505' || 
            insertError.message?.includes('duplicate') ||
            insertError.message?.includes('unique constraint');
          
          if (isDuplicate) {
            console.log('[Like] Duplicate detected, silently ignoring...');
            // Duplicate - just ignore silently, don't throw
            // The like already exists, which is the desired end state
            return;
          }
          throw insertError;
        }

        await supabase.rpc('increment_likes_count', { post_id: postId });
        console.log('[Like] Like successful');

        // Create notification if not own post
        if (postUserId !== user.id) {
          try {
            await supabase.from('notifications').insert({
              user_id: postUserId,
              type: 'like',
              title: 'New Like',
              message: `${user.user_metadata?.full_name || user.email} liked your post`,
              related_user_id: user.id,
              related_post_id: postId,
            });
          } catch (error) {
            console.error('[Like] Failed to create notification:', error);
          }
        }
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      console.log('[Like] onMutate - Optimistic update', { postId, isLiked });
      
      // Optimistic update
      const queryKey = [...queryKeys.social.feed(), feedFilter, sortBy];
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any[]) => 
            page.map(post => {
              if (post.id === postId) {
                const baseline = Number(post.likes_count ?? 0);
                const newIsLiked = !isLiked;
                const newCount = isLiked ? Math.max(baseline - 1, 0) : baseline + 1;
                console.log('[Like] Updating post:', { 
                  postId, 
                  oldIsLiked: isLiked, 
                  newIsLiked, 
                  oldCount: baseline, 
                  newCount 
                });
                return {
                  ...post,
                  isLiked: newIsLiked,
                  likes_count: newCount,
                };
              }
              return post;
            })
          )
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error('[Like] onError - Rolling back', err);
      
      // Rollback on error
      if (context?.previousData) {
        const queryKey = [...queryKeys.social.feed(), feedFilter, sortBy];
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      console.log('[Like] onSuccess - Invalidating queries');
      // Invalidate to sync with server data
      queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false });
    },
    onSettled: (data, error, variables) => {
      console.log('[Like] onSettled - Final invalidation');
      
      // Remove this post from pending likes
      setPendingLikes(prev => {
        const next = new Set(prev);
        next.delete(variables.postId);
        return next;
      });
      
      // Always refetch after mutation settles (success or error)
      queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false });
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('social-feed-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          toast({
            title: "New Post",
            description: "New content is available",
            action: (
              <Button 
                size="sm" 
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false })}
              >
                Refresh
              </Button>
            ),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.social.feed(), exact: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    const sentinel = document.querySelector('#load-more-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLike = (postId: string, isLiked: boolean, postUserId: string) => {
    // Prevent multiple simultaneous likes on the same post
    if (pendingLikes.has(postId)) {
      console.log('[Like] Already pending for this post, ignoring click');
      return;
    }
    
    // Mark this post as pending
    setPendingLikes(prev => new Set(prev).add(postId));
    
    likeMutation.mutate({ postId, isLiked, postUserId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted/20 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Home</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full relative"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Mail className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => navigate("/create-post")}
                size="icon"
                className="rounded-full"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="container max-w-2xl mx-auto px-4 pt-4">
        <Tabs value={feedFilter} onValueChange={(v) => setFeedFilter(v as any)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">All Posts</TabsTrigger>
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="rounds">
              <Trophy className="h-4 w-4 mr-2" />
              Rounds
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort Toggle */}
        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'latest' ? 'popular' : 'latest')}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {sortBy === 'latest' ? 'Latest' : 'Popular'}
          </Button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="container max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {feedFilter === 'all' ? (
                <>
                  <p className="text-lg font-semibold mb-2">No posts yet</p>
                  <p className="text-sm">Be the first to share your golf experience!</p>
                  <Button onClick={() => navigate("/create-post")} className="mt-4">
                    Create Post
                  </Button>
                </>
              ) : feedFilter === 'friends' ? (
                <>
                  <p className="text-lg font-semibold mb-2">No posts from friends yet</p>
                  <p className="text-sm">Add friends to see their golf experiences and updates</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold mb-2">No round posts yet</p>
                  <p className="text-sm">Posts with golf rounds will appear here</p>
                </>
              )}
            </div>
          </Card>
        ) : (
          posts.map((post: any) => (
            <Card key={post.id} className="overflow-hidden">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.full_name} />
                  <AvatarFallback>
                    {post.profiles?.full_name?.charAt(0) || post.profiles?.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">
                    {post.profiles?.full_name || post.profiles?.username}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </div>
                </div>
                <PostActions postId={post.id} postUserId={post.user_id} />
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {/* Text Content */}
                  {post.content && (
                    <p className="text-base whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Images */}
                  {post.image_urls && post.image_urls.length > 0 && (
                    <PostImageGrid
                      images={post.image_urls}
                      onImageClick={(index) => {
                        setSelectedImages(post.image_urls.map((img: any) => img.url));
                        setSelectedImageIndex(index);
                      }}
                    />
                  )}

                  {/* Fallback for old posts with single image_url */}
                  {post.image_url && (!post.image_urls || post.image_urls.length === 0) && (
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => {
                        setSelectedImages([post.image_url]);
                        setSelectedImageIndex(0);
                      }}
                    >
                      <img
                        src={post.image_url}
                        alt="Post content"
                        className="w-full rounded-lg object-contain max-h-[500px] bg-muted"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                          e.currentTarget.classList.add('opacity-50');
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                  )}

                  {/* Round Summary */}
                  {post.rounds && (
                    <RoundSummaryCard 
                      round={post.rounds}
                      stats={post.roundStats}
                      onClick={() => setSelectedRoundForDialog({
                        roundId: post.rounds.id,
                        courseId: post.rounds.course_id,
                      })}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Post Actions */}
              <div className="px-4 py-3 flex items-center gap-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.isLiked, post.user_id)}
                  className={`gap-2 transition-all duration-200 ${post.isLiked ? "text-destructive" : ""}`}
                  disabled={pendingLikes.has(post.id)}
                >
                  <Heart
                    className={`h-5 w-5 transition-all duration-200 ${post.isLiked ? "scale-110" : "scale-100"}`}
                    fill={post.isLiked ? "currentColor" : "none"}
                  />
                  <span className="transition-all duration-200">{post.likes_count || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setSelectedPostForComments({ 
                    postId: post.id, 
                    postUserId: post.user_id 
                  })}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments_count || 0}</span>
                </Button>
              </div>
            </Card>
          ))
        )}

        {/* Infinite Scroll Sentinel */}
        <div id="load-more-sentinel" className="h-4" />

        {/* Loading More Indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>

      {/* Comments Sheet */}
      {selectedPostForComments && (
        <PostComments
          postId={selectedPostForComments.postId}
          postUserId={selectedPostForComments.postUserId}
          open={!!selectedPostForComments}
          onOpenChange={(open) => !open && setSelectedPostForComments(null)}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={selectedImages}
        initialIndex={selectedImageIndex}
        open={selectedImages.length > 0}
        onOpenChange={(open) => !open && setSelectedImages([])}
      />

      {/* Round Summary Dialog */}
      {selectedRoundForDialog && (
        <RoundSummaryDialog
          roundId={selectedRoundForDialog.roundId}
          courseId={selectedRoundForDialog.courseId}
          open={!!selectedRoundForDialog}
          onOpenChange={(open) => !open && setSelectedRoundForDialog(null)}
        />
      )}

      <MobileNav />
    </div>
  );
};

const RoundSummaryCard = ({ round, onClick, stats }: { round: any; onClick?: () => void; stats?: any }) => {
  // Use actual totalPar from completed holes if available, otherwise fall back to course par
  const effectivePar = stats?.totalPar ?? round.courses.total_par;

  return (
    <div 
      className={`bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-4 space-y-4 ${onClick ? 'cursor-pointer hover:from-primary/15 hover:to-accent/15 transition-colors' : ''}`}
      onClick={onClick}
    >
      {/* Course Info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-lg">{round.courses.name}</div>
          <div className="text-sm text-muted-foreground">Round Summary</div>
        </div>
        <Trophy className="h-6 w-6 text-primary" />
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center">
          <div className="text-4xl font-bold">{round.total_score}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Score</div>
        </div>
        <Separator orientation="vertical" className="h-12" />
        <div className="text-center">
          <Badge
            variant={getVsParValue(round.total_score, effectivePar) <= 0 ? "default" : "destructive"}
            className="text-xl px-3 py-1"
          >
            {calculateVsPar(round.total_score, effectivePar)}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">vs Par</div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-semibold">{stats.totalPutts}</div>
            <div className="text-xs text-muted-foreground">Putts</div>
          </div>
          <div className="text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-semibold">
              {stats.fairwaysTotal > 0 ? `${stats.fairwaysHit}/${stats.fairwaysTotal}` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Fairways</div>
          </div>
          <div className="text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-semibold">
              {stats.total > 0 ? `${stats.girsHit}/${stats.total}` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">GIR</div>
          </div>
          {(stats.birdies > 0 || stats.eagles > 0) && (
            <div className="col-span-3 text-center pt-2 border-t">
              <Award className="h-4 w-4 mx-auto mb-1 text-primary" />
              <div className="text-sm font-semibold">
                {stats.eagles > 0 && `${stats.eagles} Eagle${stats.eagles > 1 ? 's' : ''}`}
                {stats.eagles > 0 && stats.birdies > 0 && ' + '}
                {stats.birdies > 0 && `${stats.birdies} Birdie${stats.birdies !== 1 ? 's' : ''}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click hint */}
      {onClick && (
        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          Click to view full details
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
