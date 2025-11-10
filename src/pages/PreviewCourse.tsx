import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  MapPin,
  Target,
  ChevronRight,
  Loader2,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { Enums } from "@/integrations/supabase/types";
import { getSubCourseDisplayRange, filterHolesBySubCourses } from "@/lib/courseUtils";

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

const PreviewCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedTee, setSelectedTee] = useState<TeeType | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch course configurations
  const { data: configurations, isLoading: configurationsLoading } = useQuery({
    queryKey: ['course-configurations', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data, error } = await supabase
        .from('course_configurations')
        .select(`
          *,
          configuration_sub_courses(
            sequence,
            sub_courses(id, name, start_hole, end_hole)
          )
        `)
        .eq('course_id', id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch holes with tee positions
  const { data: holes, isLoading: holesLoading } = useQuery({
    queryKey: ['holes-preview', id],
    queryFn: async () => {
      if (!id) throw new Error('Course ID is required');
      
      const { data, error } = await supabase
        .from('holes')
        .select(`
          *,
          tee_positions(*)
        `)
        .eq('course_id', id)
        .order('hole_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleTeeSelect = (teeType: TeeType) => {
    setSelectedTee(teeType);
  };

  const handleStartPreview = () => {
    if (!selectedTee || !holes || holes.length === 0) return;
    
    // If configuration is selected, use its first hole
    if (selectedConfigId && configurations) {
      const config = configurations.find(c => c.id === selectedConfigId);
      if (config && config.configuration_sub_courses && config.configuration_sub_courses.length > 0) {
        const firstSubCourse = config.configuration_sub_courses
          .sort((a: any, b: any) => a.sequence - b.sequence)[0]
          ?.sub_courses;
        
        if (firstSubCourse) {
          navigate(`/courses/${id}/preview-hole/${firstSubCourse.start_hole}?tee=${selectedTee}`);
          return;
        }
      }
    }
    
    // Default: use first hole
    const firstHole = holes[0];
    navigate(`/courses/${id}/preview-hole/${firstHole.hole_number}?tee=${selectedTee}`);
  };

  const isLoading = courseLoading || holesLoading || configurationsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading course preview...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Course Not Found</h1>
          <Link to="/courses">
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const availableTees = (course.available_tee_types || []) as TeeType[];
  // Filter holes to only show those in configured sub-courses
  const filteredHoles = filterHolesBySubCourses(holes || [], configurations || []);
  const displayHoles = filteredHoles;
  const hasConfigurations = configurations && configurations.length > 0;

  // Auto-select default configuration if available
  if (hasConfigurations && !selectedConfigId) {
    const defaultConfig = configurations.find(c => c.is_default);
    if (defaultConfig) {
      setSelectedConfigId(defaultConfig.id);
    } else {
      setSelectedConfigId(configurations[0].id);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      <div className="relative bg-card border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={`/courses/${id}`}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Preview Course</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{course.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Configuration Selection */}
        {hasConfigurations && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Select Course Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configurations.map((config: any) => {
                const totalHoles = config.total_holes;
                const subCourses = config.configuration_sub_courses
                  ?.map((cs: any) => cs.sub_courses)
                  .filter(Boolean)
                  .sort((a: any, b: any) => {
                    const seqA = config.configuration_sub_courses.find(
                      (cs: any) => cs.sub_courses?.id === a.id
                    )?.sequence || 0;
                    const seqB = config.configuration_sub_courses.find(
                      (cs: any) => cs.sub_courses?.id === b.id
                    )?.sequence || 0;
                    return seqA - seqB;
                  }) || [];

                const subCoursesWithDisplay = subCourses.map((sc: any) => {
                  const displayRange = getSubCourseDisplayRange(sc, subCourses);
                  return {
                    name: sc.name,
                    displayRange: `${displayRange.start}-${displayRange.end}`,
                  };
                });

                return (
                  <Button
                    key={config.id}
                    variant={selectedConfigId === config.id ? "default" : "outline"}
                    onClick={() => setSelectedConfigId(config.id)}
                    className="w-full justify-start h-auto py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.name}</span>
                          {config.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {subCoursesWithDisplay.length > 0 && (
                          <div className="flex flex-col items-start text-xs text-muted-foreground">
                            <span>{subCoursesWithDisplay.map((sc: any) => sc.name).join(' + ')}</span>
                            <span className="text-primary font-medium">
                              Holes: {subCoursesWithDisplay.map((sc: any) => sc.displayRange).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {totalHoles} holes
                      </span>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Tee Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Select Tee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {availableTees.map((teeType) => {
              const teeHoles = displayHoles.filter(hole => 
                hole.tee_positions?.some((tp: any) => tp.tee_type === teeType)
              );
              const totalDistance = teeHoles.reduce((sum, hole) => {
                const teePos = hole.tee_positions?.find((tp: any) => tp.tee_type === teeType);
                return sum + (teePos?.distance_to_pin || 0);
              }, 0);

              return (
                <Button
                  key={teeType}
                  variant={selectedTee === teeType ? "default" : "outline"}
                  onClick={() => handleTeeSelect(teeType)}
                  className="w-full justify-start h-auto py-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2"
                        style={{
                          backgroundColor: TEE_COLORS[teeType],
                          borderColor: teeType === 'white' ? '#ccc' : TEE_COLORS[teeType],
                        }}
                      />
                      <span>{TEE_LABELS[teeType]} Tees</span>
                    </div>
                    {totalDistance > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {totalDistance}y
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Start Preview Button */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6"
          onClick={handleStartPreview}
          disabled={!selectedTee || displayHoles.length === 0}
        >
          <ChevronRight className="h-6 w-6 mr-2" />
          Start Preview
        </Button>
      </div>

      <MobileNav />
    </div>
  );
};

export default PreviewCourse;
