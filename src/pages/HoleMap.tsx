import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { Enums } from "@/integrations/supabase/types";
import { SimpleHoleMap } from "@/components/SimpleHoleMap";

type TeeType = Enums<"tee_type">;

const TEE_COLORS: Record<TeeType, string> = {
  black: "#000000",
  blue: "#3b82f6",
  white: "#ffffff",
  yellow: "#fbbf24",
  red: "#ef4444",
};

const TEE_LABELS: Record<TeeType, string> = {
  black: "Black",
  blue: "Blue",
  white: "White",
  yellow: "Yellow",
  red: "Red",
};

const HoleMap = () => {
  const { courseId, holeNumber } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  const [notes, setNotes] = useState("");
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);
  const [customScoreInput, setCustomScoreInput] = useState(false);
  const [customScore, setCustomScore] = useState("");
  const [moreStatsOpen, setMoreStatsOpen] = useState(false);
  
  // Score state
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedPutts, setSelectedPutts] = useState<number | null>(null);
  const [fairwayHit, setFairwayHit] = useState<boolean | null>(null);
  const [greenInReg, setGreenInReg] = useState<boolean | null>(null);
  const [chipShots, setChipShots] = useState<number | null>(null);
  const [sandShots, setSandShots] = useState<number | null>(null);
  const [penalties, setPenalties] = useState<number | null>(null);

  const roundId = searchParams.get('roundId');
  const selectedTee = (searchParams.get('tee') as TeeType) || 'blue';

  // Fetch round data to get configuration
  const { data: roundData } = useQuery({
    queryKey: ['round-data', roundId],
    queryFn: async () => {
      if (!roundId) return null;
      
      const { data, error } = await supabase
        .from('rounds')
        .select('*, course_configurations(total_holes)')
        .eq('id', roundId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundId,
  });

  // Fetch hole data with tee positions
  const { data: holeData, isLoading: holeLoading } = useQuery({
    queryKey: ['hole-play', courseId, holeNumber],
    queryFn: async () => {
      if (!courseId || !holeNumber) throw new Error('Course ID and hole number required');
      
      const { data, error } = await supabase
        .from('holes')
        .select(`
          *,
          courses(*),
          tee_positions(*)
        `)
        .eq('course_id', courseId)
        .eq('hole_number', parseInt(holeNumber))
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!holeNumber,
  });

  // Calculate total holes and check if this is the last hole
  const totalHoles = roundData?.course_configurations?.total_holes || 18;
  const isLastHole = holeData?.hole_number === totalHoles;

  const { data: teePosition } = useQuery({
    queryKey: ['tee-position', holeData?.id, selectedTee],
    queryFn: async () => {
      if (!holeData?.id || !selectedTee) return null;
      
      const { data, error } = await supabase
        .from('tee_positions')
        .select('*')
        .eq('hole_id', holeData.id)
        .eq('tee_type', selectedTee)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!holeData?.id && !!selectedTee,
  });

  const { data: existingScore, refetch: refetchScore } = useQuery({
    queryKey: ['hole-score', roundId, holeData?.id],
    queryFn: async () => {
      if (!roundId || !holeData?.id) return null;
      
      const { data, error } = await supabase
        .from('hole_scores')
        .select('*')
        .eq('round_id', roundId)
        .eq('hole_id', holeData.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundId && !!holeData?.id,
  });


  const handleEnterScore = () => {
    setScoreSheetOpen(true);
    setCustomScoreInput(false);
  };

  const handleCustomScoreSubmit = () => {
    const score = parseInt(customScore);
    if (score && score > 0) {
      setSelectedScore(score);
      setCustomScoreInput(false);
      setCustomScore("");
    }
  };

  const handleSaveAndNext = async () => {
    if (!selectedScore) {
      alert("Please enter a score");
      return;
    }

    try {
      const scoreData = {
        round_id: roundId,
        hole_id: holeData.id,
        strokes: selectedScore,
        putts: selectedPutts || null,
        fairway_hit: fairwayHit || null,
        green_in_regulation: greenInReg || null,
        sand_saves: sandShots || 0,
        penalties: penalties || 0,
      };

      if (existingScore) {
        const { error } = await supabase
          .from('hole_scores')
          .update(scoreData)
          .eq('id', existingScore.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hole_scores')
          .insert(scoreData);
        
        if (error) throw error;
      }

      await refetchScore();

      const { data: allScores } = await supabase
        .from('hole_scores')
        .select('strokes')
        .eq('round_id', roundId);

      if (allScores) {
        const totalScore = allScores.reduce((sum, score) => sum + score.strokes, 0);
        
        await supabase
          .from('rounds')
          .update({ total_score: totalScore })
          .eq('id', roundId);
      }

      // Invalidate round-summary query to refresh data when navigating back
      queryClient.invalidateQueries({ queryKey: ['round-summary', roundId] });

      setSelectedScore(null);
      setSelectedPutts(null);
      setFairwayHit(null);
      setGreenInReg(null);
      setChipShots(null);
      setSandShots(null);
      setPenalties(null);
      setNotes("");
      setScoreSheetOpen(false);
      
      const nextHole = holeData.hole_number + 1;
      
      // Check if this is the last hole
      if (isLastHole) {
        // Mark round as completed
        await supabase
          .from('rounds')
          .update({ 
            is_completed: true,
            current_hole: totalHoles 
          })
          .eq('id', roundId);
        
        // Navigate to round summary
        navigate(`/courses/${courseId}/round-summary?roundId=${roundId}`);
      } else {
        // Continue to next hole
        await supabase
          .from('rounds')
          .update({ current_hole: nextHole })
          .eq('id', roundId);
        
        navigate(`/courses/${courseId}/hole/${nextHole}?roundId=${roundId}&tee=${selectedTee}`);
      }
    } catch (error) {
      console.error("Error saving score:", error);
      alert("Failed to save score. Please try again.");
    }
  };

  const handlePrevious = async () => {
    const prevHole = holeData.hole_number - 1;
    if (prevHole >= 1) {
      // Update current_hole in rounds table
      if (roundId) {
        await supabase
          .from('rounds')
          .update({ current_hole: prevHole })
          .eq('id', roundId);
      }
      navigate(`/courses/${courseId}/hole/${prevHole}?roundId=${roundId}&tee=${selectedTee}`);
    }
  };

  const handleNext = async () => {
    const nextHole = holeData.hole_number + 1;
    if (nextHole <= totalHoles) {
      // Update current_hole in rounds table
      if (roundId) {
        await supabase
          .from('rounds')
          .update({ current_hole: nextHole })
          .eq('id', roundId);
      }
      navigate(`/courses/${courseId}/hole/${nextHole}?roundId=${roundId}&tee=${selectedTee}`);
    }
  };

  useEffect(() => {
    if (existingScore && scoreSheetOpen) {
      setSelectedScore(existingScore.strokes);
      setSelectedPutts(existingScore.putts);
      setFairwayHit(existingScore.fairway_hit);
      setGreenInReg(existingScore.green_in_regulation);
      setSandShots(existingScore.sand_saves || 0);
      setPenalties(existingScore.penalties || 0);
    }
  }, [existingScore, scoreSheetOpen]);

  if (!mapboxToken || holeLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">
          {holeLoading ? "Loading hole data..." : "Loading GPS map..."}
        </p>
      </div>
    );
  }

  if (!holeData) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-destructive">Hole data not found</p>
          <p className="text-sm text-muted-foreground">
            This hole may not have GPS coordinates yet
          </p>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  // Prepare coordinates for SimpleHoleMap
  const teeCoords: [number, number] | undefined = teePosition?.longitude && teePosition?.latitude
    ? [teePosition.longitude, teePosition.latitude]
    : holeData.tee_longitude && holeData.tee_latitude
    ? [holeData.tee_longitude, holeData.tee_latitude]
    : undefined;

  const pinCoords: [number, number] | undefined = holeData.pin_longitude && holeData.pin_latitude
    ? [holeData.pin_longitude, holeData.pin_latitude]
    : undefined;

  const targetCoords: [number, number] | undefined = holeData.target_longitude && holeData.target_latitude
    ? [holeData.target_longitude, holeData.target_latitude]
    : undefined;

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map Container */}
      <div className="absolute inset-0">
        {mapboxToken && teeCoords && pinCoords && (
          <SimpleHoleMap
            mapboxToken={mapboxToken}
            teeCoords={teeCoords}
            pinCoords={pinCoords}
            targetCoords={targetCoords}
          />
        )}
      </div>

      {/* Top Bar with Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/courses/${courseId}`)}
          className="rounded-full bg-card/95 backdrop-blur-sm h-12 w-12"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Card - Hole Info and Navigation */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-16 pb-1.5">
        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardContent className="py-1.5 px-2.5">
            <div className="flex items-center justify-between mb-1.5">
              {/* Previous Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={holeData.hole_number === 1}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              {/* Hole Info */}
              <div className="text-center flex-1">
                <h3 className="text-lg font-bold mb-0">Hole {holeData.hole_number}</h3>
                <div className="flex items-center justify-center gap-2 mt-0">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Par</p>
                    <p className="text-xs font-bold">{holeData.par}</p>
                   </div>
                  {teePosition && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="text-xs font-bold">{teePosition.distance_to_pin} yd</p>
                    </div>
                  )}
                  {holeData.handicap_index && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">HCP</p>
                      <p className="text-xs font-bold">{holeData.handicap_index}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Next Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={isLastHole}
                className="h-7 w-7"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Enter Score Button */}
            <Button 
              onClick={handleEnterScore} 
              className="w-full h-12 text-sm flex flex-col items-center justify-center gap-0"
            >
              {existingScore ? (
                <>
                  <span className="text-[10px] font-normal opacity-70">Edit Score</span>
                  <span className="text-xl font-bold">{existingScore.strokes}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-normal opacity-70">Enter Score</span>
                  <span className="text-base font-semibold">Hole {holeData.hole_number}</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Round Summary Button */}
      <div className="absolute bottom-20 right-3 z-10">
        <Button
          variant="default"
          size="icon"
          onClick={() => navigate(`/courses/${courseId}/round-summary?from=${holeData.hole_number}&roundId=${roundId}&tee=${selectedTee}`)}
          className="h-12 w-12 rounded-full shadow-lg"
          title="View Round Summary"
        >
          <ClipboardList className="h-5 w-5" />
        </Button>
      </div>

      {/* Score Entry Sheet */}
      <Sheet open={scoreSheetOpen} onOpenChange={setScoreSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quick Score Entry - Hole {holeData.hole_number}</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-4">
            {!customScoreInput ? (
              <>
                {/* Score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Score</Label>
                    <Button 
                      variant="link" 
                      size="sm"
                      className="text-primary h-auto p-0"
                      onClick={() => setCustomScoreInput(true)}
                    >
                      Others (11+)
                    </Button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <Button
                        key={score}
                        variant={selectedScore === score ? "default" : "outline"}
                        onClick={() => setSelectedScore(score)}
                        className="min-w-[70px] h-16 text-2xl font-bold flex-shrink-0"
                      >
                        <div className="flex flex-col items-center">
                          {score}
                          {score === holeData.par && <span className="text-[10px]">Par</span>}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Putts */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Putts</Label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((p) => (
                      <Button
                        key={p}
                        variant={selectedPutts === p ? "default" : "outline"}
                        onClick={() => setSelectedPutts(p)}
                        className="flex-1 h-14 text-xl"
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant={selectedPutts === 4 ? "default" : "outline"}
                      onClick={() => setSelectedPutts(4)}
                      className="flex-1 h-14 text-lg"
                    >
                      ≥4
                    </Button>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="fairway"
                      checked={fairwayHit === true}
                      onCheckedChange={(checked) => setFairwayHit(checked === true)}
                    />
                    <Label htmlFor="fairway" className="cursor-pointer">Fairway Hit</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="gir"
                      checked={greenInReg === true}
                      onCheckedChange={(checked) => setGreenInReg(checked === true)}
                    />
                    <Label htmlFor="gir" className="cursor-pointer">Green in Regulation</Label>
                  </div>
                </div>
                
                {/* Collapsible More Stats */}
                <Collapsible open={moreStatsOpen} onOpenChange={setMoreStatsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                      {moreStatsOpen ? "▼" : "▶"} More Stats (Optional)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-3 pt-3 border-t">
                    {/* Chip Shots */}
                    <div className="space-y-2">
                      <Label className="text-sm">Chip Shots</Label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((shots) => (
                          <Button
                            key={shots}
                            variant={chipShots === shots ? "default" : "outline"}
                            onClick={() => setChipShots(shots)}
                            className="flex-1 h-12"
                            size="sm"
                          >
                            {shots}
                          </Button>
                        ))}
                        <Button
                          variant={chipShots === 4 ? "default" : "outline"}
                          onClick={() => setChipShots(4)}
                          className="flex-1 h-12"
                          size="sm"
                        >
                          ≥4
                        </Button>
                      </div>
                    </div>

                    {/* Sand Shots */}
                    <div className="space-y-2">
                      <Label className="text-sm">Sand Shots</Label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((shots) => (
                          <Button
                            key={shots}
                            variant={sandShots === shots ? "default" : "outline"}
                            onClick={() => setSandShots(shots)}
                            className="flex-1 h-12"
                            size="sm"
                          >
                            {shots}
                          </Button>
                        ))}
                        <Button
                          variant={sandShots === 4 ? "default" : "outline"}
                          onClick={() => setSandShots(4)}
                          className="flex-1 h-12"
                          size="sm"
                        >
                          ≥4
                        </Button>
                      </div>
                    </div>

                    {/* Penalties */}
                    <div className="space-y-2">
                      <Label className="text-sm">Penalties</Label>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((penalty) => (
                          <Button
                            key={penalty}
                            variant={penalties === penalty ? "default" : "outline"}
                            onClick={() => setPenalties(penalty)}
                            className="flex-1 h-12"
                            size="sm"
                          >
                            {penalty}
                          </Button>
                        ))}
                        <Button
                          variant={penalties === 4 ? "default" : "outline"}
                          onClick={() => setPenalties(4)}
                          className="flex-1 h-12"
                          size="sm"
                        >
                          ≥4
                        </Button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm">Notes (Optional)</Label>
                      <Input
                        placeholder="Add notes about this hole..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <>
                {/* Custom Score Input */}
                <Button 
                  variant="link" 
                  className="text-primary p-0 h-auto"
                  onClick={() => setCustomScoreInput(false)}
                >
                  ← Back to Score Selection
                </Button>

                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Enter Custom Score</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter stroke count greater than 10
                    </p>
                  </div>
                  
                  <Input
                    type="number"
                    min="11"
                    placeholder="Enter score (11+)"
                    value={customScore}
                    onChange={(e) => setCustomScore(e.target.value)}
                    className="text-2xl h-16 text-center font-bold"
                  />

                  <Button
                    onClick={handleCustomScoreSubmit}
                    className="w-full h-12"
                    disabled={!customScore || parseInt(customScore) < 11}
                  >
                    Confirm Score
                  </Button>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
              <Button
                variant="outline"
                onClick={() => setScoreSheetOpen(false)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAndNext}
                className="flex-1 h-12"
                disabled={!selectedScore}
              >
                {isLastHole ? "Finish Round" : "Save & Next Hole"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MobileNav />
    </div>
  );
};

export default HoleMap;
