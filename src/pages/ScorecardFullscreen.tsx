import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const ScorecardFullscreen = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roundId = searchParams.get("roundId");
  const fromHole = searchParams.get("from") || "18";
  const tee = searchParams.get("tee") || "white";
  const isMobile = useIsMobile();

  const { data: roundData, isLoading } = useQuery({
    queryKey: ['scorecard-fullscreen', roundId],
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

      // 4. Merge: Create 18 holes with scores (or null if not recorded)
      const mergedHoles = allHoles.map(hole => {
        const score = holeScores?.find(hs => hs.hole_id === hole.id);
        return {
          hole: hole,
          score: score || null,
          strokes: score?.strokes || null,
          putts: score?.putts || null,
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
          <p className="text-muted-foreground">Loading scorecard...</p>
        </div>
      </div>
    );
  }

  if (!roundData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Scorecard not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const holeScores = roundData.holeScores;
  
  // Calculate statistics (only count holes with recorded scores)
  const completedHoles = holeScores.filter(h => h.strokes !== null);
  const totalScore = completedHoles.reduce((sum, hs) => sum + (hs.strokes || 0), 0);
  const totalPar = completedHoles.reduce((sum, hs) => sum + (hs.hole?.par || 0), 0);

  // Split into Front 9 and Back 9
  const frontNine = holeScores.slice(0, 9);
  const backNine = holeScores.slice(9, 18);

  // Calculate Front 9 totals (only completed holes)
  const frontNineScore = frontNine
    .filter(h => h.strokes !== null)
    .reduce((sum, h) => sum + (h.strokes || 0), 0);

  const frontNinePar = frontNine
    .filter(h => h.strokes !== null)
    .reduce((sum, h) => sum + (h.hole?.par || 0), 0);

  // Calculate Back 9 totals (only completed holes)
  const backNineScore = backNine
    .filter(h => h.strokes !== null)
    .reduce((sum, h) => sum + (h.strokes || 0), 0);

  const backNinePar = backNine
    .filter(h => h.strokes !== null)
    .reduce((sum, h) => sum + (h.hole?.par || 0), 0);

  const getScoreColor = (score: number, par: number) => {
    const diff = score - par;
    if (diff <= -2) return "text-yellow-500 font-bold";
    if (diff === -1) return "text-green-500 font-bold";
    if (diff === 0) return "text-foreground";
    if (diff === 1) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/courses/${courseId}/round-summary?from=${fromHole}&roundId=${roundId}&tee=${tee}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold">{roundData.round.courses?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(roundData.round.date_played).toLocaleDateString()}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Scorecard */}
        <Card className="overflow-hidden">
          <div className="p-3 bg-muted">
            <h3 className="font-bold">Full Scorecard</h3>
            {!isMobile && <p className="text-xs text-muted-foreground mt-1">Complete hole-by-hole breakdown</p>}
          </div>
          
          {isMobile ? (
            // Mobile: Vertical card layout
            <div className="space-y-4 p-4">
              {/* Front Nine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Front 9</h4>
                  <Badge variant="secondary">Par {frontNinePar || '-'}</Badge>
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
                        <div className="text-[10px] text-muted-foreground">HCP {hs.hole?.handicap_index || '-'}</div>
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
                  <span className="text-xl font-bold">{frontNineScore || '-'}</span>
                </div>
              </div>

              <Separator />

              {/* Back Nine */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Back 9</h4>
                  <Badge variant="secondary">Par {backNinePar || '-'}</Badge>
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
                        <div className="text-[10px] text-muted-foreground">HCP {hs.hole?.handicap_index || '-'}</div>
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
                  <span className="text-xl font-bold">{totalScore || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            // Desktop: Horizontal table
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[60px]">
                      HOLE
                    </th>
                    {/* Front 9: Holes 1-9 */}
                    {frontNine.map((hs) => (
                      <th key={hs.hole?.id} className="px-2 py-2 text-center font-semibold min-w-[35px] md:min-w-[45px]">
                        {hs.hole?.hole_number}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-bold bg-muted border-r-2 border-border min-w-[50px]">
                      Out
                    </th>
                    {/* Back 9: Holes 10-18 */}
                    {backNine.map((hs) => (
                      <th key={hs.hole?.id} className="px-2 py-2 text-center font-semibold min-w-[35px] md:min-w-[45px]">
                        {hs.hole?.hole_number}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-bold bg-primary text-primary-foreground min-w-[60px] sticky right-0 z-10">
                      TOT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: PAR */}
                  <tr className="border-b">
                    <td className="px-2 py-2 font-semibold sticky left-0 bg-background z-10">PAR</td>
                    {frontNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground">
                        {hs.hole?.par}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/50 border-r-2 border-border">
                      {frontNinePar || '-'}
                    </td>
                    {backNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground">
                        {hs.hole?.par}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-primary/10 sticky right-0 z-10">
                      {totalPar || '-'}
                    </td>
                  </tr>
                  
                  {/* Row 2: HANDICAP */}
                  <tr className="border-b">
                    <td className="px-2 py-2 font-semibold sticky left-0 bg-background z-10">HANDICAP</td>
                    {frontNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground text-xs">
                        {hs.hole?.handicap_index || '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center bg-muted/50 border-r-2 border-border"></td>
                    {backNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center text-muted-foreground text-xs">
                        {hs.hole?.handicap_index || '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center bg-primary/10 sticky right-0 z-10"></td>
                  </tr>
                  
                  {/* Row 3: SCORE */}
                  <tr className="border-b">
                    <td className="px-2 py-2 font-semibold sticky left-0 bg-background z-10">SCORE</td>
                    {frontNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center">
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
                            <Pencil className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold bg-muted/50 border-r-2 border-border">
                      {frontNineScore || '-'}
                    </td>
                    {backNine.map((hs) => (
                      <td key={hs.hole?.id} className="px-2 py-2 text-center">
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
                            <Pencil className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold text-lg bg-primary/10 sticky right-0 z-10">
                      {totalScore || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ScorecardFullscreen;
