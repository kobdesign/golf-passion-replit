import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Target, Award } from "lucide-react";
import { calculateVsPar, getScoreColor } from "@/lib/courseUtils";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface RoundSummaryDialogProps {
  roundId: string;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoundSummaryDialog = ({ roundId, courseId, open, onOpenChange }: RoundSummaryDialogProps) => {
  const navigate = useNavigate();

  const { data: roundData, isLoading } = useQuery({
    queryKey: ['round-summary-dialog', roundId],
    queryFn: async () => {
      if (!roundId) return null;

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
      if (!round) return null;

      // 2. Determine which configuration to use
      let configId = round.configuration_id;

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

      // 6. Merge
      const mergedHoles = allHoles.map(hole => {
        const score = holeScores?.find((hs: any) => hs.hole_id === hole.id);
        return {
          hole: hole,
          strokes: score?.strokes || null,
          putts: score?.putts || null,
          fairway_hit: score?.fairway_hit || null,
          green_in_regulation: score?.green_in_regulation || null,
        };
      });
      
      return { round, holeScores: mergedHoles };
    },
    enabled: !!roundId && open
  });

  const courseName = roundData?.round.courses?.name || 'Golf Course';
  const dateStr = roundData?.round.date_played 
    ? new Date(roundData.round.date_played).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : '';
  
  // Calculate statistics
  const holeScores = roundData?.holeScores || [];
  const completedHoles = holeScores.filter(h => h.strokes !== null);
  const totalScore = completedHoles.reduce((sum, hs) => sum + (hs.strokes || 0), 0);
  const totalPar = completedHoles.reduce((sum, hs) => sum + (hs.hole?.par || 0), 0);
  const scoreDiff = totalScore - totalPar;
  
  const totalPutts = completedHoles.reduce((sum, hs) => sum + (hs.putts || 0), 0);
  const fairwaysHit = completedHoles.filter((hs) => hs.fairway_hit).length;
  const fairwaysTotal = completedHoles.filter((hs) => (hs.hole?.par || 0) >= 4).length;
  const girsHit = completedHoles.filter((hs) => hs.green_in_regulation).length;
  const girsTotal = completedHoles.length;
  const birdies = completedHoles.filter((hs) => (hs.strokes || 0) === (hs.hole?.par || 0) - 1).length;
  const eagles = completedHoles.filter((hs) => (hs.strokes || 0) <= (hs.hole?.par || 0) - 2).length;

  const handleViewFullPage = () => {
    onOpenChange(false);
    navigate(`/courses/${courseId}/round-summary?roundId=${roundId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Round Summary</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !roundData ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Round not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Info & Score */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">{courseName}</h2>
              <p className="text-sm text-muted-foreground">{dateStr}</p>
              
              <div className="flex items-center justify-center gap-6 py-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{totalScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Score</div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="text-center">
                  <Badge
                    variant={scoreDiff <= 0 ? "default" : "destructive"}
                    className="text-xl px-3 py-1"
                  >
                    {calculateVsPar(totalScore, totalPar)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-2">vs Par</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{totalPutts}</div>
                <div className="text-xs text-muted-foreground">Total Putts</div>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {fairwaysTotal > 0 ? `${fairwaysHit}/${fairwaysTotal}` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Fairways Hit</div>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {girsTotal > 0 ? `${girsHit}/${girsTotal}` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">GIR</div>
              </div>
              
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <Award className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{birdies + eagles}</div>
                <div className="text-xs text-muted-foreground">
                  {eagles > 0 ? `${eagles} Eagle${eagles > 1 ? 's' : ''} + ` : ''}
                  {birdies} Birdie{birdies !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Hole-by-Hole Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Hole Scores</h3>
              <div className="grid grid-cols-9 gap-1 text-xs">
                {holeScores.slice(0, 9).map((hs, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-muted-foreground mb-1">{idx + 1}</div>
                    <div className={`font-semibold ${hs.strokes !== null ? getScoreColor(hs.strokes, hs.hole?.par || 0) : 'text-muted-foreground'}`}>
                      {hs.strokes !== null ? hs.strokes : '-'}
                    </div>
                  </div>
                ))}
              </div>
              {holeScores.length > 9 && (
                <div className="grid grid-cols-9 gap-1 text-xs mt-2">
                  {holeScores.slice(9, 18).map((hs, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-muted-foreground mb-1">{idx + 10}</div>
                      <div className={`font-semibold ${hs.strokes !== null ? getScoreColor(hs.strokes, hs.hole?.par || 0) : 'text-muted-foreground'}`}>
                        {hs.strokes !== null ? hs.strokes : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View Full Page Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleViewFullPage}
            >
              <ExternalLink className="h-4 w-4" />
              View Full Details
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoundSummaryDialog;
