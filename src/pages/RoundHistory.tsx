import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MobileNav from "@/components/MobileNav";
import { calculateVsPar } from "@/lib/courseUtils";
import { useState } from "react";
import RoundSummaryDialog from "@/components/RoundSummaryDialog";

interface RoundHistory {
  id: string;
  date: string;
  courseName: string;
  courseId: string;
  score: number;
  par: number;
  toPar: string;
}

const RoundHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data: roundHistory, isLoading } = useQuery<RoundHistory[]>({
    queryKey: ['full-round-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // 1. Fetch all completed rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select(`
          id,
          date_played,
          course_id,
          courses (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_played', { ascending: false });
      
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

  const handleRoundClick = (round: RoundHistory) => {
    setSelectedRoundId(round.id);
    setSelectedCourseId(round.courseId);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Round History</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-3 max-w-4xl">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : roundHistory && roundHistory.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground text-center">
                No rounds played yet
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Start your first round to see your history!
              </p>
              <Button
                onClick={() => navigate("/courses")}
                className="mt-4"
              >
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          roundHistory?.map((round) => (
            <div
              key={round.id}
              className="flex items-center justify-between p-4 rounded-lg bg-card border shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleRoundClick(round)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-full bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{round.courseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(round.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
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

export default RoundHistory;
