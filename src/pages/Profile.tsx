import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import RoundSummaryDialog from "@/components/RoundSummaryDialog";
import {
  Settings,
  Edit,
  UserPlus,
  BarChart3,
  History,
  Award,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  LogOut,
  Bookmark,
  Star,
  Shield,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { calculateVsPar } from "@/lib/courseUtils";

interface RoundHistory {
  id: string;
  date: string;
  courseName: string;
  courseId: string;
  score: number;
  par: number;
  toPar: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate("/auth", { replace: true });
  };

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch rounds statistics
  const { data: roundsStats, isLoading: statsLoading } = useQuery({
    queryKey: ['rounds-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('rounds')
        .select('total_score, is_completed')
        .eq('user_id', user.id)
        .eq('is_completed', true);
      
      if (error) throw error;
      
      const completedRounds = data || [];
      const totalRounds = completedRounds.length;
      const scores = completedRounds.map(r => r.total_score).filter(s => s !== null) as number[];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
      const bestScore = scores.length > 0 ? Math.min(...scores) : 0;
      
      return {
        totalRounds,
        avgScore,
        bestScore,
      };
    },
    enabled: !!user,
  });

  // Fetch friends count
  const { data: friendsCount = 0 } = useQuery({
    queryKey: ['friends-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch round history
  const { data: roundHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['round-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // 1. Fetch completed rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id,
          date_played,
          course_id,
          courses (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_played', { ascending: false })
        .limit(10);
      
      if (roundsError) throw roundsError;
      if (!rounds || rounds.length === 0) return [];

      // 2. Fetch hole scores for all rounds
      const roundIds = rounds.map(r => r.id);
      
      const { data: holeScores, error: scoresError } = await supabase
        .from('hole_scores')
        .select('round_id, hole_id, strokes')
        .in('round_id', roundIds);
      
      if (scoresError) throw scoresError;
      if (!holeScores || holeScores.length === 0) return [];
      
      // 3. Get unique hole IDs
      const holeIds = [...new Set(holeScores.map(hs => hs.hole_id))];
      
      // 4. Fetch par values for these holes
      const { data: holes, error: holesError } = await supabase
        .from('holes')
        .select('id, par')
        .in('id', holeIds);
      
      if (holesError) throw holesError;
      
      // 5. Create a map of hole_id -> par
      const parMap = new Map(holes?.map(h => [h.id, h.par]) || []);
      
      // 6. Aggregate by round_id
      const aggregates: Record<string, { strokesSum: number; parSum: number }> = {};
      
      holeScores.forEach(hs => {
        if (!aggregates[hs.round_id]) {
          aggregates[hs.round_id] = { strokesSum: 0, parSum: 0 };
        }
        
        aggregates[hs.round_id].strokesSum += hs.strokes;
        aggregates[hs.round_id].parSum += parMap.get(hs.hole_id) || 0;
      });
      
      // 7. Map to RoundHistory format
      return rounds.map(round => {
        const agg = aggregates[round.id];
        const score = agg?.strokesSum || 0;
        const par = agg?.parSum || 0;
        
        return {
          id: round.id,
          date: round.date_played,
          courseName: round.courses?.name || 'Unknown Course',
          courseId: round.course_id,
          score,
          par,
          toPar: score > 0 && par > 0 ? calculateVsPar(score, par) : 'N/A',
        };
      }) as RoundHistory[];
    },
    enabled: !!user,
  });

  // Fetch FIR & GIR statistics
  const { data: advancedStats } = useQuery({
    queryKey: ['advanced-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: roundIds } = await supabase
        .from('rounds')
        .select('id')
        .eq('user_id', user.id);
      
      if (!roundIds || roundIds.length === 0) return { fir: 0, gir: 0 };
      
      const { data: holeScores, error } = await supabase
        .from('hole_scores')
        .select('fairway_hit, green_in_regulation')
        .in('round_id', roundIds.map(r => r.id));
      
      if (error) throw error;
      
      const fairwayData = holeScores?.filter(h => h.fairway_hit !== null) || [];
      const fairwayHits = fairwayData.filter(h => h.fairway_hit === true).length;
      const firPercentage = fairwayData.length > 0 
        ? Math.round((fairwayHits / fairwayData.length) * 100) 
        : 0;
      
      const girData = holeScores || [];
      const girHits = girData.filter(h => h.green_in_regulation === true).length;
      const girPercentage = girData.length > 0 
        ? Math.round((girHits / girData.length) * 100) 
        : 0;
      
      return {
        fir: firPercentage,
        gir: girPercentage,
      };
    },
    enabled: !!user,
  });

  // Calculate achievements dynamically
  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', user?.id, roundsStats],
    queryFn: async () => {
      if (!user || !roundsStats) return [];
      
      // Fetch additional data for achievements
      const { data: roundIds } = await supabase
        .from('rounds')
        .select('id, course_id')
        .eq('user_id', user.id)
        .eq('is_completed', true);
      
      const { data: holeScores } = await supabase
        .from('hole_scores')
        .select('strokes, hole_id, holes!inner(par)')
        .in('round_id', (roundIds || []).map(r => r.id));
      
      const { data: parOrBetterRounds } = await supabase
        .from('rounds')
        .select('id, total_score, courses!inner(total_par)')
        .eq('user_id', user.id)
        .eq('is_completed', true);
      
      // Calculate achievement data
      const birdieCount = (holeScores || []).filter(h => 
        h.strokes === h.holes.par - 1
      ).length;
      
      const eagleCount = (holeScores || []).filter(h => 
        h.strokes === h.holes.par - 2
      ).length;
      
      const parOrBetterCount = (parOrBetterRounds || []).filter(r => 
        r.total_score <= r.courses.total_par
      ).length;
      
      const uniqueCourses = new Set((roundIds || []).map(r => r.course_id)).size;
      const totalRounds = roundsStats.totalRounds;
      
      const achievementsList: Achievement[] = [
        { 
          id: "1", 
          title: "First Round", 
          description: "Complete your first round", 
          icon: "🏌️", 
          unlocked: totalRounds >= 1,
          progress: Math.min(totalRounds, 1),
          total: 1,
        },
        { 
          id: "2", 
          title: "Birdie Master", 
          description: "Score 10 birdies", 
          icon: "🐦", 
          unlocked: birdieCount >= 10,
          progress: Math.min(birdieCount, 10),
          total: 10,
        },
        { 
          id: "3", 
          title: "Par Perfectionist", 
          description: "Score par or better on 5 rounds", 
          icon: "🎯", 
          unlocked: parOrBetterCount >= 5,
          progress: Math.min(parOrBetterCount, 5),
          total: 5,
        },
        { 
          id: "4", 
          title: "Course Explorer", 
          description: "Play 5 different courses", 
          icon: "🗺️", 
          unlocked: uniqueCourses >= 5,
          progress: Math.min(uniqueCourses, 5),
          total: 5,
        },
        { 
          id: "5", 
          title: "Eagle Eye", 
          description: "Score an eagle", 
          icon: "🦅", 
          unlocked: eagleCount >= 1,
          progress: Math.min(eagleCount, 1),
          total: 1,
        },
        { 
          id: "6", 
          title: "Consistency King", 
          description: "Play 20 rounds", 
          icon: "👑", 
          unlocked: totalRounds >= 20,
          progress: Math.min(totalRounds, 20),
          total: 20,
        },
      ];
      
      return achievementsList;
    },
    enabled: !!user && !!roundsStats,
  });

  // Fetch user's bookmarks count
  const { data: bookmarksCount = 0 } = useQuery({
    queryKey: ['bookmarks-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('course_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch user's reviews count
  const { data: reviewsCount = 0 } = useQuery({
    queryKey: ['reviews-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('course_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) return false;
      return data || false;
    },
    enabled: !!user,
  });

  const displayedRounds = showAllRounds ? roundHistory : roundHistory.slice(0, 3);
  
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent p-6 pb-24">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-foreground">Profile</h1>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Card (overlapping header) */}
      <div className="container max-w-4xl mx-auto px-4 -mt-16 space-y-6">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            {profileLoading ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-4 w-full">
                  <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
                  <Skeleton className="h-6 w-32 mx-auto sm:mx-0" />
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl font-bold">{userName}</h2>
                    <div className="flex items-center gap-2 justify-center sm:justify-start mt-2">
                      <Badge className="bg-gradient-to-r from-primary to-accent text-lg px-3 py-1">
                        <Target className="h-4 w-4 mr-1" />
                        HCP {profile?.handicap || 0}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto" />
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-primary">{roundsStats?.totalRounds || 0}</p>
                            <p className="text-sm text-muted-foreground">Rounds</p>
                          </>
                        )}
                      </div>
                      <div className="text-center">
                        {statsLoading ? (
                          <Skeleton className="h-8 w-12 mx-auto" />
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-primary">{roundsStats?.avgScore || 0}</p>
                            <p className="text-sm text-muted-foreground">Avg Score</p>
                          </>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{friendsCount}</p>
                        <p className="text-sm text-muted-foreground">Friends</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/edit-profile")}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/friends")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Friends
                  </Button>
                </div>

                {isAdmin && (
                  <>
                    <Separator className="my-4" />
                    <Button
                      variant="default"
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      onClick={() => navigate("/admin")}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate("/stats")}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Statistics
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-10 w-16 mx-auto" />
                    <Skeleton className="h-4 w-20 mx-auto mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{roundsStats?.avgScore || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Average Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{roundsStats?.bestScore || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Best Round</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{advancedStats?.fir || 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">FIR</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{advancedStats?.gir || 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">GIR</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookmarks & Reviews Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate("/bookmarks")}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-primary" />
                  Bookmarked Courses
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {bookmarksCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage your favorite golf courses
              </p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate("/course-reviews")}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Course Reviews
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {reviewsCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your ratings and reviews for golf courses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Round History Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Round History
            </CardTitle>
            {roundHistory.length > 3 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/round-history")}
              >
                View All
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : displayedRounds.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No rounds played yet. Start your first round!
              </p>
            ) : (
              displayedRounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedRoundId(round.id);
                    setSelectedCourseId(round.courseId);
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{round.courseName}</p>
                      <p className="text-sm text-muted-foreground">{round.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{round.score}</p>
                    <p className="text-sm text-muted-foreground">
                      {round.toPar}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Achievements Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    achievement.unlocked
                      ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 shadow-sm"
                      : "bg-muted/50 border-muted grayscale opacity-50"
                  }`}
                >
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    {!achievement.unlocked && achievement.progress !== undefined && (
                      <p className="text-xs text-primary mt-1">
                        {achievement.progress}/{achievement.total}
                      </p>
                    )}
                  </div>
                  {achievement.unlocked && (
                    <Trophy className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5 mr-2" />
            Account Settings
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <RoundSummaryDialog
        roundId={selectedRoundId || ''}
        courseId={selectedCourseId || ''}
        open={!!selectedRoundId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoundId(null);
            setSelectedCourseId(null);
          }
        }}
      />

      <MobileNav />
    </div>
  );
};

export default Profile;