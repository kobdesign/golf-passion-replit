import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
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

const PreviewHole = () => {
  const { courseId, holeNumber } = useParams<{ courseId: string; holeNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  const { user } = useAuth();

  const selectedTee = searchParams.get('tee') as TeeType;

  // Fetch hole data
  const { data: holeData, isLoading: holeLoading } = useQuery({
    queryKey: ['hole-preview', courseId, holeNumber],
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

  // Fetch all holes for navigation
  const { data: allHoles } = useQuery({
    queryKey: ['all-holes', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('Course ID required');
      const { data, error } = await supabase
        .from('holes')
        .select('hole_number')
        .eq('course_id', courseId)
        .order('hole_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch active round for this course
  const { data: activeRound } = useQuery({
    queryKey: ['active-round', courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user?.id,
  });

  const handlePrevious = () => {
    if (!allHoles || !holeNumber) return;
    const currentIdx = allHoles.findIndex(h => h.hole_number === parseInt(holeNumber));
    if (currentIdx > 0) {
      const prevHole = allHoles[currentIdx - 1];
      navigate(`/courses/${courseId}/preview-hole/${prevHole.hole_number}?tee=${selectedTee}`);
    }
  };

  const handleNext = () => {
    if (!allHoles || !holeNumber) return;
    const currentIdx = allHoles.findIndex(h => h.hole_number === parseInt(holeNumber));
    if (currentIdx < allHoles.length - 1) {
      const nextHole = allHoles[currentIdx + 1];
      navigate(`/courses/${courseId}/preview-hole/${nextHole.hole_number}?tee=${selectedTee}`);
    }
  };

  const handleButtonClick = () => {
    if (activeRound) {
      // Continue existing round
      const teeType = selectedTee || 'blue';
      const holeNumber = activeRound.current_hole || 1;
      navigate(`/courses/${courseId}/hole/${holeNumber}?roundId=${activeRound.id}&tee=${teeType}`);
    } else {
      // Start new round
      navigate(`/courses/${courseId}/start-round`);
    }
  };

  if (!mapboxToken || holeLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading hole preview...</p>
        </div>
      </div>
    );
  }

  if (!holeData) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Hole not found</p>
      </div>
    );
  }

  const teePosition = holeData.tee_positions?.find(
    (tp: any) => tp.tee_type === selectedTee
  );

  const currentIdx = allHoles?.findIndex(h => h.hole_number === parseInt(holeNumber || '0')) ?? -1;
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === (allHoles?.length ?? 0) - 1;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="relative bg-card border-b z-[5]">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/courses/${courseId}/preview`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center flex-1">
              <h2 className="text-lg font-bold">{holeData.courses?.name}</h2>
              <p className="text-sm text-muted-foreground">Preview Mode</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {mapboxToken && holeData && teePosition && holeData.pin_latitude && holeData.pin_longitude && (
          <SimpleHoleMap
            mapboxToken={mapboxToken}
            teeCoords={[teePosition.longitude, teePosition.latitude]}
            pinCoords={[holeData.pin_longitude, holeData.pin_latitude]}
            targetCoords={
              holeData.target_latitude && holeData.target_longitude
                ? [holeData.target_longitude, holeData.target_latitude]
                : undefined
            }
          />
        )}
      </div>

      {/* Bottom Info Card - Compact */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-16 pb-1.5">
        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardContent className="py-1.5 px-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={isFirst}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center flex-1">
                <h3 className="text-lg font-bold">Hole {holeData.hole_number}</h3>
                <div className="flex items-center justify-center gap-2 mt-0">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Par</p>
                    <p className="text-xs font-bold">{holeData.par}</p>
                  </div>
                   {teePosition && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Distance</p>
                      <p className="text-xs font-bold">{teePosition.distance_to_pin} yd</p>
                    </div>
                  )}
                  {holeData.handicap_index && (
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">HCP</p>
                      <p className="text-xs font-bold">{holeData.handicap_index}</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={isLast}
                className="h-7 w-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              size="default"
              className="w-full h-9 bg-gradient-to-r from-primary to-accent font-bold"
              onClick={handleButtonClick}
            >
              {activeRound ? 'Continue Round' : 'Start a Round'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
};

export default PreviewHole;
