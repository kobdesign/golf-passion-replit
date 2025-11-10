import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Target, TrendingUp, Maximize2, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import { calculateVsPar, getScoreColor } from "@/lib/courseUtils";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const RoundSummary = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromHole = searchParams.get("from") || "18";
  const roundId = searchParams.get("roundId");
  const tee = searchParams.get("tee") || "white";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: roundData, isLoading } = useQuery({
    queryKey: ['round-summary', roundId],
    queryFn: async () => {
      if (!roundId) throw new Error("Round ID is required");

      // 1. Fetch round data
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .select(`
          *,
          courses(name, id)
        `)
        .eq('id', roundId)
        .single();
      
      if (roundError) throw roundError;
      if (!round) throw new Error('Round not found');

      // 2. Determine which configuration to use
      let configId = round.configuration_id;

      // Fallback: if no configuration_id, use default
      if (!configId) {
        const { data: defaultConfig } = await supabase
          .from('course_configurations')
          .select('id')
          .eq('course_id', round.course_id)
          .eq('is_default', true)
          .maybeSingle();
        
        configId = defaultConfig?.id;
      }

      // 3. Fetch sub_course_ids from the configuration
      let finalSubCourseIds: string[] = [];
      if (configId) {
        const { data: configSubCourses } = await supabase
          .from('configuration_sub_courses')
          .select('sub_course_id')
          .eq('configuration_id', configId)
          .order('sequence', { ascending: true });
        
        finalSubCourseIds = configSubCourses?.map(cs => cs.sub_course_id).filter(Boolean) || [];
      }

      // 4. Fetch holes for these sub-courses
      const { data: allHoles, error: holesError } = await supabase
        .from('holes')
        .select('*')
        .eq('course_id', round.course_id)
        .in('sub_course_id', finalSubCourseIds)
        .order('hole_number', { ascending: true });

      if (holesError) throw holesError;

      // 5. Fetch hole scores
      const { data: holeScores, error: scoresError } = await supabase
        .from('hole_scores')
        .select('*')
        .eq('round_id', roundId);

      if (scoresError) throw scoresError;

      // 6. Merge: Create holes with scores (or null if not recorded)
      const mergedHoles = allHoles.map(hole => {
        const score = holeScores?.find((hs: any) => hs.hole_id === hole.id);
        return {
          hole: hole,
          score: score || null,
          strokes: score?.strokes || null,
          putts: score?.putts || null,
          fairway_hit: score?.fairway_hit || null,
          green_in_regulation: score?.green_in_regulation || null,
        };
      });
      
      return { round, holeScores: mergedHoles };
    },
    enabled: !!roundId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading round summary...</p>
        </div>
      </div>
    );
  }

  if (!roundData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Round not found</p>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  const courseName = roundData.round.courses?.name || 'Golf Course';
  const isCompleted = roundData.round.is_completed || false;
  const dateStr = new Date(roundData.round.date_played).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  
  // Calculate statistics (only count holes with recorded scores)
  const holeScores = roundData.holeScores;
  const completedHoles = holeScores.filter(h => h.strokes !== null);
  const totalScore = completedHoles.reduce((sum, hs) => sum + (hs.strokes || 0), 0);
  const totalPar = completedHoles.reduce((sum, hs) => sum + (hs.hole?.par || 0), 0);
  const scoreDiff = totalScore - totalPar;
  
  const frontNine = holeScores.filter(hs => (hs.hole?.hole_number || 0) <= 9);
  const backNine = holeScores.filter(hs => (hs.hole?.hole_number || 0) > 9);

  const frontNineTotal = frontNine.reduce((sum, hs) => sum + (hs.strokes || 0), 0);
  const backNineTotal = backNine.reduce((sum, hs) => sum + (hs.strokes || 0), 0);
  const frontNinePar = frontNine
    .filter(hs => hs.strokes !== null)
    .reduce((sum, hs) => sum + (hs.hole?.par || 0), 0);
  const backNinePar = backNine
    .filter(hs => hs.strokes !== null)
    .reduce((sum, hs) => sum + (hs.hole?.par || 0), 0);

  const totalPutts = completedHoles.reduce((sum, hs) => sum + (hs.putts || 0), 0);
  const fairwaysHit = completedHoles.filter((hs) => hs.fairway_hit).length;
  const fairwaysTotal = completedHoles.filter((hs) => (hs.hole?.par || 0) >= 4).length;
  const girsHit = completedHoles.filter((hs) => hs.green_in_regulation).length;
  const girsTotal = completedHoles.length;
  const birdies = completedHoles.filter((hs) => (hs.strokes || 0) === (hs.hole?.par || 0) - 1).length;
  const eagles = completedHoles.filter((hs) => (hs.strokes || 0) <= (hs.hole?.par || 0) - 2).length;

  const handleShare = async () => {
    const shareText = `⛳ I just played ${courseName}!\n\n🏌️ Score: ${totalScore} (${calculateVsPar(totalScore, totalPar)})\n📅 ${dateStr}\n\n#Golf #GolfScore`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Golf Round at ${courseName}`,
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard!",
        description: "Share text copied. Paste it anywhere you like.",
      });
    }
  };

  const handleDeleteRound = async () => {
    if (!roundId) return;
    
    try {
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

      toast({
        title: "Round Deleted",
        description: "Your round and all related data have been permanently deleted.",
      });
      
      // Navigate back to course detail
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error("Error deleting round:", error);
      toast({
        title: "Error",
        description: "Failed to delete round. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/courses/${courseId}/hole/${fromHole}?roundId=${roundId}&tee=${tee}`)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Round Summary</h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/stats/${courseId}`)}
                className="rounded-full"
              >
                <TrendingUp className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        {/* Course Info & Score Overview */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{courseName}</h2>
              <p className="text-sm text-muted-foreground">{dateStr}</p>
            </div>

            <div className="flex items-center justify-center gap-8 py-6">
              <div className="text-center">
                <div className="text-5xl font-bold">{totalScore}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Score</div>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-center">
                <Badge
                  variant={scoreDiff <= 0 ? "default" : "destructive"}
                  className="text-2xl px-4 py-2"
                >
                  {calculateVsPar(totalScore, totalPar)}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">vs Par</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Scorecard */}
        <Card className="overflow-hidden">
          <div className="p-4 bg-muted flex items-center justify-between">
            <h3 className="font-bold text-lg">Scorecard</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/courses/${courseId}/scorecard?roundId=${roundId}&from=${fromHole}`)}
              className="rounded-full"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
          
          {isMobile ? (
            // Mobile: Card-based layout
            <div className="space-y-4 p-4">
              {/* Front Nine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Front 9</h4>
                  <Badge variant="secondary">{frontNinePar}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {frontNine.map((hs) => (
                    <Card 
                      key={hs.hole?.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/courses/${courseId}/hole/${hs.hole?.hole_number}?roundId=${roundId}&tee=${tee}`)}
                    >
                      <div className="p-3 text-center space-y-1">
                        <div className="text-xs text-muted-foreground">Hole {hs.hole?.hole_number}</div>
                        <div className="text-xs text-muted-foreground">Par {hs.hole?.par}</div>
                        {hs.strokes !== null ? (
                          <div className={`text-2xl font-bold ${getScoreColor(hs.strokes, hs.hole?.par || 0)}`}>
                            {hs.strokes}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Pencil className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-between items-center px-2 py-3 bg-muted/30 rounded-lg">
                  <span className="font-bold">OUT</span>
                  <span className="text-xl font-bold">{frontNineTotal}</span>
                </div>
              </div>

              <Separator />

              {/* Back Nine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Back 9</h4>
                  <Badge variant="secondary">{backNinePar}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {backNine.map((hs) => (
                    <Card 
                      key={hs.hole?.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/courses/${courseId}/hole/${hs.hole?.hole_number}?roundId=${roundId}&tee=${tee}`)}
                    >
                      <div className="p-3 text-center space-y-1">
                        <div className="text-xs text-muted-foreground">Hole {hs.hole?.hole_number}</div>
                        <div className="text-xs text-muted-foreground">Par {hs.hole?.par}</div>
                        {hs.strokes !== null ? (
                          <div className={`text-2xl font-bold ${getScoreColor(hs.strokes, hs.hole?.par || 0)}`}>
                            {hs.strokes}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Pencil className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-between items-center px-2 py-3 bg-primary/10 rounded-lg">
                  <span className="font-bold">TOTAL</span>
                  <span className="text-xl font-bold">{totalScore}</span>
                </div>
              </div>
            </div>
          ) : (
            // Desktop: Table layout
            <div className="overflow-x-auto">
              {/* Front Nine */}
              <table className="w-full text-sm table-fixed">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-16 px-3 py-2 text-left font-semibold">Hole</th>
                    {frontNine.map((hs) => (
                      <th key={hs.hole?.id} className="w-12 px-2 py-2 text-center font-semibold">
                        {hs.hole?.hole_number}
                      </th>
                    ))}
                    <th className="w-16 px-3 py-2 text-center font-bold bg-muted">OUT</th>
                    <th className="w-20 px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Par</td>
                    {frontNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground">
                        {hs.hole?.par}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/30">
                      {frontNinePar}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Score</td>
                    {frontNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center relative">
                        <button
                          onClick={() => navigate(`/courses/${courseId}/hole/${hs.hole?.hole_number}?roundId=${roundId}&tee=${tee}`)}
                          className="w-full h-full flex items-center justify-center hover:bg-accent/50 transition-colors rounded cursor-pointer group"
                          title="Edit hole score"
                        >
                          {hs.strokes !== null ? (
                            <span className={`font-semibold ${getScoreColor(hs.strokes, hs.hole?.par || 0)} group-hover:underline`}>
                              {hs.strokes}
                            </span>
                          ) : (
                            <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/30">
                      {frontNineTotal}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* Back Nine */}
              <table className="w-full text-sm mt-4 table-fixed">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-16 px-3 py-2 text-left font-semibold">Hole</th>
                    {backNine.map((hs) => (
                      <th key={hs.hole?.id} className="w-12 px-2 py-2 text-center font-semibold">
                        {hs.hole?.hole_number}
                      </th>
                    ))}
                    <th className="w-16 px-3 py-2 text-center font-bold bg-muted">IN</th>
                    <th className="w-20 px-3 py-2 text-center font-bold bg-primary text-primary-foreground">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Par</td>
                    {backNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground">
                        {hs.hole?.par}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/30">
                      {backNinePar}
                    </td>
                    <td className="px-3 py-2 text-center font-bold bg-primary/10">
                      {totalPar}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Score</td>
                    {backNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center relative">
                        <button
                          onClick={() => navigate(`/courses/${courseId}/hole/${hs.hole?.hole_number}?roundId=${roundId}&tee=${tee}`)}
                          className="w-full h-full flex items-center justify-center hover:bg-accent/50 transition-colors rounded cursor-pointer group"
                          title="Edit hole score"
                        >
                          {hs.strokes !== null ? (
                            <span className={`font-semibold ${getScoreColor(hs.strokes, hs.hole?.par || 0)} group-hover:underline`}>
                              {hs.strokes}
                            </span>
                          ) : (
                            <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/30">
                      {backNineTotal}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-lg bg-primary/10">
                      {totalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Summary Statistics */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">Round Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{totalPutts}</div>
              <div className="text-sm text-muted-foreground">Total Putts</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {fairwaysHit}/{fairwaysTotal}
              </div>
              <div className="text-sm text-muted-foreground">
                Fairways Hit ({Math.round((fairwaysHit / fairwaysTotal) * 100)}%)
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {girsHit}/18
              </div>
              <div className="text-sm text-muted-foreground">
                Greens in Regulation ({girsTotal > 0 ? Math.round((girsHit / girsTotal) * 100) : 0}%)
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-500">{birdies}</div>
              <div className="text-sm text-muted-foreground">Birdies</div>
            </div>
            {eagles > 0 && (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-500">{eagles}</div>
                <div className="text-sm text-muted-foreground">Eagles</div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {completedHoles.length > 0 ? (totalPutts / completedHoles.length).toFixed(1) : '0.0'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Putts/Hole</div>
            </div>
          </div>
        </Card>

        {/* Strokes Gained Analysis - Disabled for now */}
        {/* Future feature: Add strokes gained tracking */}

        {/* Action Buttons */}
        <div className="flex gap-3 pb-6">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => {
              if (isCompleted) {
                navigate(`/courses/${courseId}`);
              } else {
                navigate(`/courses/${courseId}/hole/${fromHole}?roundId=${roundId}&tee=${tee}`);
              }
            }}
          >
            {isCompleted ? "Back to Course" : "Back to GPS"}
          </Button>
          <Button
            variant="default"
            className="flex-1 h-12 gap-2"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            Share Round
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this round? This action cannot be undone and will delete:
              <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                <li>All hole scores ({roundData?.holeScores.length || 0} holes)</li>
                <li>Shot tracking data</li>
                <li>Leaderboard entries</li>
                <li>Related social posts</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRound}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
};

export default RoundSummary;
