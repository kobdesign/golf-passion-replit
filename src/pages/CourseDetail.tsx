import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useIsBookmarked, useBookmarks } from "@/hooks/useBookmarks";
import {
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  Globe,
  Bookmark,
  Map as MapIcon,
  Play,
  TrendingUp,
  History,
  Users,
  Award,
  RefreshCw,
  Trophy,
  Settings,
  Loader2,
  PlayCircle,
  Flag,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import CourseMap from "@/components/CourseMap";
import MobileNav from "@/components/MobileNav";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { toast } from "@/hooks/use-toast";
import golfCourse1 from "@/assets/golf-course-1.jpg";
import golfCourse2 from "@/assets/golf-course-2.jpg";
import golfCourse3 from "@/assets/golf-course-3.jpg";
import golfCourse4 from "@/assets/golf-course-4.jpg";

interface CourseDetail {
  id: string;
  name: string;
  image_url: string | null;
  total_holes: number | null;
  location: string | null;
  description: string | null;
  total_par: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  average_rating: number | null;
  total_reviews: number | null;
}

interface RoundHistory {
  id: string;
  date: string;
  score: number | null;
  par: number | null;
}

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [finishRoundDialogOpen, setFinishRoundDialogOpen] = useState(false);
  const [deleteRoundDialogOpen, setDeleteRoundDialogOpen] = useState(false);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Course not found');
      
      return data as CourseDetail;
    },
    enabled: !!id,
  });

  // Fetch current user
  const { data: { user } = {} } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    },
  });

  // Use custom hooks
  const { data: isAdmin } = useIsAdmin();
  const { data: isBookmarked } = useIsBookmarked(id || '');
  const { toggleBookmark } = useBookmarks();

  // Fetch user's existing review
  const { data: userReview } = useQuery({
    queryKey: ['user-review', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      
      const { data } = await supabase
        .from('course_reviews')
        .select('rating, review_text')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch user's rounds for this course
  const { data: rounds } = useQuery({
    queryKey: ['rounds', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_played', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch hole scores aggregates for all completed rounds
  const { data: roundAggregates } = useQuery({
    queryKey: ['round-aggregates', id],
    queryFn: async () => {
      if (!rounds || rounds.length === 0) return {};
      
      const roundIds = rounds.map(r => r.id);
      
      // Fetch all hole scores for these rounds
      const { data: holeScores, error: scoresError } = await supabase
        .from('hole_scores')
        .select('round_id, hole_id, strokes')
        .in('round_id', roundIds);
      
      if (scoresError) throw scoresError;
      if (!holeScores || holeScores.length === 0) return {};
      
      // Get unique hole IDs
      const holeIds = [...new Set(holeScores.map(hs => hs.hole_id))];
      
      // Fetch par values for these holes
      const { data: holes, error: holesError } = await supabase
        .from('holes')
        .select('id, par')
        .in('id', holeIds);
      
      if (holesError) throw holesError;
      
      // Create a map of hole_id -> par
      const parMap = new Map(holes?.map(h => [h.id, h.par]) || []);
      
      // Aggregate by round_id
      const aggregates: Record<string, { strokesSum: number; parSum: number; holesPlayed: number }> = {};
      
      holeScores.forEach(hs => {
        if (!aggregates[hs.round_id]) {
          aggregates[hs.round_id] = { strokesSum: 0, parSum: 0, holesPlayed: 0 };
        }
        
        aggregates[hs.round_id].strokesSum += hs.strokes;
        aggregates[hs.round_id].parSum += parMap.get(hs.hole_id) || 0;
        aggregates[hs.round_id].holesPlayed += 1;
      });
      
      return aggregates;
    },
    enabled: !!rounds && rounds.length > 0,
  });

  // Fetch active round for this course
  const { data: activeRound } = useQuery({
    queryKey: ['active-round', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch leaderboard data
  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data, error } = await supabase
        .from('leaderboards')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .eq('course_id', id)
        .order('best_score', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch sub-courses to get accurate hole count
  const { data: subCourses } = useQuery({
    queryKey: ['sub-courses', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data, error } = await supabase
        .from('sub_courses')
        .select('*')
        .eq('course_id', id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Course Not Found</h1>
          <p className="text-muted-foreground">The course you're looking for doesn't exist.</p>
          <Link to="/courses">
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate stats from real rounds
  const roundHistory: RoundHistory[] = rounds?.map(r => {
    const agg = roundAggregates?.[r.id];
    return {
      id: r.id,
      date: r.date_played,
      score: agg?.strokesSum ?? null,
      par: agg?.parSum ?? null,
    };
  }) || [];

  // Filter out rounds without scores for calculations
  const roundsWithScores = roundHistory.filter(r => r.score !== null && r.score > 0);

  const averageScore = roundsWithScores.length > 0
    ? roundsWithScores.reduce((sum, round) => sum + (round.score || 0), 0) / roundsWithScores.length
    : 0;

  const averagePar = roundsWithScores.length > 0
    ? roundsWithScores.reduce((sum, round) => sum + (round.par || 0), 0) / roundsWithScores.length
    : course.total_par;

  const bestScore = roundsWithScores.length > 0
    ? Math.min(...roundsWithScores.map((r) => r.score || 0))
    : 0;

  // Calculate total holes from sub-courses or use course default
  const totalHoles = subCourses && subCourses.length > 0
    ? subCourses.reduce((sum, sc) => sum + (sc.end_hole - sc.start_hole + 1), 0)
    : course?.total_holes || 18;

  // Handle bookmark toggle
  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to bookmark courses.",
        variant: "destructive",
      });
      return;
    }

    if (id) {
      toggleBookmark(id);
    }
  };

  // Handle finish round
  const handleFinishRound = async () => {
    if (!activeRound) return;

    try {
      const { error } = await supabase
        .from('rounds')
        .update({ is_completed: true })
        .eq('id', activeRound.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['active-round', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['rounds', id] });
      queryClient.invalidateQueries({ queryKey: ['round-aggregates', id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });

      toast({
        title: "Round Completed!",
        description: "Your round has been marked as complete.",
      });

      setFinishRoundDialogOpen(false);
      navigate(`/courses/${id}/round-summary?roundId=${activeRound.id}`);
    } catch (error) {
      console.error("Error finishing round:", error);
      toast({
        title: "Error",
        description: "Failed to finish round. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete active round
  const handleDeleteActiveRound = async () => {
    if (!activeRound) return;
    
    try {
      const roundId = activeRound.id;

      // 1. Delete hole_scores
      const { error: scoresError } = await supabase
        .from('hole_scores')
        .delete()
        .eq('round_id', roundId);
      
      if (scoresError) throw scoresError;

      // 2. Delete shots
      const { error: shotsError } = await supabase
        .from('shots')
        .delete()
        .eq('round_id', roundId);
      
      if (shotsError) throw shotsError;

      // 3. Delete leaderboards
      const { error: leaderboardError } = await supabase
        .from('leaderboards')
        .delete()
        .eq('round_id', roundId);
      
      if (leaderboardError) throw leaderboardError;

      // 4. Delete posts linked to this round (if any)
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('round_id', roundId);
      
      if (postsError) throw postsError;

      // 5. Finally delete the round
      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);
      
      if (roundError) throw roundError;

      // 6. Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['active-round', id, user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['rounds', id] });
      await queryClient.invalidateQueries({ queryKey: ['round-aggregates', id] });
      await queryClient.refetchQueries({ queryKey: ['rounds', id] });
      
      toast({
        title: "Round Deleted",
        description: "Your active round and all related data have been deleted.",
      });
      
      setDeleteRoundDialogOpen(false);
    } catch (error) {
      console.error("Error deleting round:", error);
      toast({
        title: "Error",
        description: "Failed to delete round. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Default image if none provided
  const defaultImages = [golfCourse1, golfCourse2, golfCourse3, golfCourse4];
  const courseImage = course.image_url || defaultImages[Math.floor(Math.random() * defaultImages.length)];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
        <div className="relative h-64 overflow-hidden">
          <img
            src={courseImage}
            alt={course.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <Link to="/courses">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full backdrop-blur-sm bg-card/90"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleBookmark}
              className="rounded-full backdrop-blur-sm bg-card/90"
            >
              <Bookmark
                className={`h-5 w-5 transition-all duration-300 ${
                  isBookmarked ? "fill-primary text-primary" : ""
                }`}
              />
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="container max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                {course.name}
              </h1>
              <div className="flex items-center gap-4 text-foreground/90">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{course.location || "Unknown location"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{course.total_holes || 18} holes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 mt-6 space-y-6">
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(`/courses/${id}/preview`)}
              variant="outline"
              className="w-full h-12 sm:h-14 text-base sm:text-lg bg-card hover:border-primary transition-all"
            >
              <MapIcon className="h-5 w-5 mr-2" />
              Preview Course
            </Button>
            
            {activeRound && !(activeRound as any).is_completed ? (
              <>
                <Button
                  className="w-full h-12 sm:h-14 text-base sm:text-lg bg-gradient-to-r from-green-600 to-green-500 hover:opacity-90"
                  onClick={() => {
                    const holeNumber = (activeRound as any).current_hole || 1;
                    const teeType = (activeRound as any).tee_type || 'blue';
                    navigate(`/courses/${id}/hole/${holeNumber}?roundId=${activeRound.id}&tee=${teeType}`);
                  }}
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Continue Round
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setFinishRoundDialogOpen(true)}
                  >
                    <Flag className="h-5 w-5 mr-2" />
                    Finish Round
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteRoundDialogOpen(true)}
                    className="h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <Button
                className="w-full h-12 sm:h-14 text-base sm:text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
                onClick={() => navigate(`/courses/${id}/start-round`)}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Round
              </Button>
            )}
            
            {isAdmin && (
              <Button
                onClick={() => navigate(`/admin/courses/${id}`)}
                variant="outline"
                className="w-full h-12 sm:h-14 text-base sm:text-lg bg-card hover:border-primary transition-all"
              >
                <Settings className="h-5 w-5 mr-2" />
                จัดการข้อมูลหลุมแบบละเอียด
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              className="bg-gradient-to-r from-primary to-accent"
            >
              {totalHoles} Holes
            </Badge>
            {course.average_rating && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {course.average_rating.toFixed(1)} ({course.total_reviews || 0})
              </Badge>
            )}
            <Badge variant="outline">
              Par {course.total_par}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviewDialogOpen(true)}
              className="h-7 px-3"
            >
              <Star className={`h-4 w-4 mr-1 ${userReview ? 'fill-primary text-primary' : ''}`} />
              {userReview ? 'Update Rating' : 'Rate Course'}
            </Button>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                My Course Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {roundHistory.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rounds Played
                  </p>
                </div>
                {roundHistory.length > 0 ? (
                  <>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {averageScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg Score
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {bestScore}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Best Score
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {roundsWithScores.length > 0 ? averagePar.toFixed(1) : course.total_par}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {roundsWithScores.length > 0 ? 'Avg Par' : 'Total Par'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">
                        {averageScore > 0 && averagePar > 0 ? (
                          averageScore > averagePar ? '+' : ''
                        ) : ''}
                        {averageScore > 0 && averagePar > 0 
                          ? (averageScore - averagePar).toFixed(1) 
                          : '-'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg vs Par
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 text-center py-4">
                    <p className="text-muted-foreground">No rounds played yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Leaderboards
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/leaderboard/${id}`)}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboardData && leaderboardData.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Best Scores (Last 365 days)
                  </p>
                  {leaderboardData.map((entry, index) => {
                    const profile = entry.profiles as any;
                    const scoreToPar = entry.best_score - course.total_par;
                    const scoreDisplay = scoreToPar > 0 
                      ? `+${scoreToPar} (${entry.best_score})`
                      : scoreToPar === 0
                      ? `E (${entry.best_score})`
                      : `${scoreToPar} (${entry.best_score})`;
                    
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-[80px]">
                          {index === 0 && (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
                              {index + 1}
                            </div>
                          )}
                          {index !== 0 && (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                            {profile?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{profile?.username || 'Unknown'}</p>
                        </div>
                        <p className="text-lg font-bold">{scoreDisplay}</p>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No leaderboard data yet
                </p>
              )}
            </CardContent>
          </Card>


          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                My Round History
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {roundHistory.length > 0 ? (
                roundHistory.slice(0, 3).map((round) => (
                  <div
                    key={round.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/courses/${id}/round-summary?roundId=${round.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{round.date}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {round.score && round.score > 0 ? round.score : "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {round.score && round.par && round.par > 0
                          ? (round.score - round.par === 0
                              ? "E"
                              : `${round.score - round.par > 0 ? "+" : ""}${round.score - round.par}`)
                          : "No score"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No rounds played yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Holes</p>
                  <p className="text-xl font-semibold">{totalHoles}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Par</p>
                  <p className="text-xl font-semibold">{course.total_par}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-xl font-semibold">{course.location || "N/A"}</p>
                </div>
              </div>

              <Separator />
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/courses")}
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Switch Course
          </Button>
        </div>
      </div>

      {showMap && course.latitude && course.longitude && (
        <CourseMap
          courseName={course.name}
          coordinates={[course.longitude, course.latitude]}
          onClose={() => setShowMap(false)}
        />
      )}

      <MobileNav />
      
      {course && (
        <CourseReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          courseId={course.id}
          courseName={course.name}
          existingReview={userReview}
        />
      )}

      <AlertDialog open={finishRoundDialogOpen} onOpenChange={setFinishRoundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish this round? This will mark the round as complete and you won't be able to add more scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishRound}>
              Finish Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRoundDialogOpen} onOpenChange={setDeleteRoundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this round? This action cannot be undone and will delete:
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                <li>All hole scores</li>
                <li>Shot tracking data</li>
                <li>Leaderboard entries</li>
                <li>Related social posts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteActiveRound}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CourseDetail;
