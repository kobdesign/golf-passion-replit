import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  MapPin,
  Play,
  Target,
  Eye,
  Loader2,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Enums } from "@/integrations/supabase/types";
import { getAvailableStartingHoles, getGlobalHoleNumber } from "@/lib/courseUtils";

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

const StartRoundSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [startingHole, setStartingHole] = useState("1");
  const [scoringMode, setScoringMode] = useState<"classic" | "smart">("classic");
  const [selectedTee, setSelectedTee] = useState<TeeType | null>(null);
  const [visibility, setVisibility] = useState("everyone");
  const [showActiveRoundDialog, setShowActiveRoundDialog] = useState(false);
  const [existingActiveRound, setExistingActiveRound] = useState<any>(null);
  const isMobile = useIsMobile();

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

  // Check for active rounds across all courses
  const { data: userActiveRounds } = useQuery({
    queryKey: ['user-active-rounds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('rounds')
        .select(`
          *,
          courses(name)
        `)
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = courseLoading || configurationsLoading;
  const hasConfigurations = configurations && configurations.length > 0;
  const availableTees = (course?.available_tee_types || []) as TeeType[];

  // Auto-select default configuration
  if (hasConfigurations && !selectedConfigId) {
    const defaultConfig = configurations.find((c: any) => c.is_default);
    if (defaultConfig) {
      setSelectedConfigId(defaultConfig.id);
    } else {
      setSelectedConfigId(configurations[0].id);
    }
  }

  const handleStartRound = async () => {
    if (!selectedConfigId || !selectedTee || !user) {
      toast.error("Please complete all required settings");
      return;
    }
    
    // Check if user has any active rounds
    if (userActiveRounds && userActiveRounds.length > 0) {
      setExistingActiveRound(userActiveRounds[0]);
      setShowActiveRoundDialog(true);
      return;
    }
    
    // No active rounds, proceed to create new one
    await createNewRound();
  };

  const createNewRound = async () => {
    if (!user || !id || !selectedConfigId || !selectedTee) return;
    
    // Get the selected configuration
    const selectedConfig = configurations?.find(c => c.id === selectedConfigId);
    if (!selectedConfig) return;
    
    // Convert display hole number to global hole number
    let globalStartingHole = parseInt(startingHole);
    if (selectedConfig?.configuration_sub_courses?.length) {
      const subCourses = selectedConfig.configuration_sub_courses
        .map((cs: any) => cs.sub_courses)
        .filter(Boolean)
        .sort((a: any, b: any) => {
          const seqA = selectedConfig.configuration_sub_courses.find(
            (cs: any) => cs.sub_courses?.id === a.id
          )?.sequence || 0;
          const seqB = selectedConfig.configuration_sub_courses.find(
            (cs: any) => cs.sub_courses?.id === b.id
          )?.sequence || 0;
          return seqA - seqB;
        });
      
      globalStartingHole = getGlobalHoleNumber(parseInt(startingHole), subCourses);
    }
    
    // Create round in database
    const { data: newRound, error } = await supabase
      .from('rounds')
      .insert([{
        user_id: user.id,
        course_id: id as string,
        mode: "classic" as const,
        visibility: visibility as "everyone" | "friends" | "private",
        is_completed: false,
        current_hole: globalStartingHole,
        configuration_id: selectedConfigId,
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Error creating round:", error);
      toast.error("Failed to create round. Please try again.");
      return;
    }
    
    toast.success("Round created successfully!");
    
    // Navigate to the GPS map starting at the global hole number with selected tee
    navigate(`/courses/${id}/hole/${globalStartingHole}?roundId=${newRound.id}&tee=${selectedTee}`);
  };

  const handleFinishAndStartNew = async () => {
    if (!existingActiveRound) return;
    
    // Finish the existing round
    const { error: finishError } = await supabase
      .from('rounds')
      .update({ is_completed: true })
      .eq('id', existingActiveRound.id);
    
    if (finishError) {
      toast.error("Failed to finish existing round");
      return;
    }
    
    toast.success("Previous round finished!");
    
    // Close dialog and create new round
    setShowActiveRoundDialog(false);
    await createNewRound();
  };

  const handleContinueExisting = () => {
    if (!existingActiveRound) return;
    
    const courseId = existingActiveRound.course_id;
    const holeNumber = existingActiveRound.current_hole || 1;
    const roundId = existingActiveRound.id;
    const teeType = existingActiveRound.tee_type || 'blue';
    
    navigate(`/courses/${courseId}/hole/${holeNumber}?roundId=${roundId}&tee=${teeType}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading round settings...</p>
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
              <h1 className="text-2xl font-bold">Round Settings</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{course.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`container max-w-4xl mx-auto mt-6 space-y-${isMobile ? '4' : '6'} ${isMobile ? 'px-3' : 'px-4'}`}>
        {/* Course Confirmation */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className={isMobile ? 'p-4' : ''}>
            <div className={`flex items-center ${isMobile ? 'flex-col gap-3 text-center' : 'justify-between'}`}>
              <div className={isMobile ? 'w-full' : ''}>
                <p className="text-sm text-muted-foreground">Selected Course</p>
                <h3 className={`font-bold mt-1 ${isMobile ? 'text-lg' : 'text-xl'}`}>{course.name}</h3>
                <p className="text-sm text-muted-foreground">{course.location}</p>
              </div>
              <Badge className="bg-gradient-to-r from-primary to-accent">
                Ready
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Course Selection */}
        {hasConfigurations && (
          <Card className="border-0 shadow-lg">
            <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                <Target className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                Course Selection
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-2 ${isMobile ? 'p-4 pt-2' : ''}`}>
              {configurations.map((config: any) => {
                const totalHoles = config.total_holes;
                const subCoursesText = config.configuration_sub_courses
                  ?.map((cs: any) => cs.sub_courses?.name)
                  .filter(Boolean)
                  .join(' + ');

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
                        {subCoursesText && (
                          <span className={`text-xs ${selectedConfigId === config.id ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                            {subCoursesText}
                          </span>
                        )}
                        {config.description && (
                          <span className={`text-xs italic ${selectedConfigId === config.id ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                            {config.description}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${selectedConfigId === config.id ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {totalHoles} holes
                      </span>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Starting Hole */}
        <Card className="border-0 shadow-lg">
          <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-base' : ''}>Starting Hole</CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-4 pt-2' : ''}>
            <Select value={startingHole} onValueChange={setStartingHole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const selectedConfig = configurations?.find(c => c.id === selectedConfigId);
                  const availableHoles = selectedConfig 
                    ? getAvailableStartingHoles(selectedConfig)
                    : Array.from({ length: 18 }, (_, i) => i + 1);
                  
                  return availableHoles.map((hole) => (
                    <SelectItem key={hole} value={hole.toString()}>
                      Hole {hole}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tee Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader className={isMobile ? 'p-4 pb-2' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
              <Target className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Tee Selection
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-2 ${isMobile ? 'p-4 pt-2' : ''}`}>
            {availableTees.map((teeType) => (
              <Button
                key={teeType}
                variant={selectedTee === teeType ? "default" : "outline"}
                onClick={() => setSelectedTee(teeType)}
                className="w-full justify-start h-auto py-3"
              >
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
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Scoring Mode & Round Visibility */}
        <Accordion type="multiple" className="space-y-6">
          {/* Scoring Mode */}
          <AccordionItem value="scoring" className="border-0">
            <Card className="border-0 shadow-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Scoring Mode
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <RadioGroup value={scoringMode} onValueChange={(value: any) => {
                    if (value !== "smart") setScoringMode(value);
                  }}>
                    <div className="space-y-3">
                      <Card
                        className={`cursor-pointer transition-all ${
                          scoringMode === "classic"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() => setScoringMode("classic")}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value="classic" id="classic" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="classic" className="text-base font-semibold cursor-pointer">
                                Classic Scorecard
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Traditional stroke-by-stroke scoring. Enter your score after each hole.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="relative cursor-not-allowed opacity-60 border-border">
                        <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          Premium
                        </Badge>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value="smart" id="smart" disabled className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="smart" className="text-base font-semibold">
                                Smart Tracking
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Track fairways hit, GIR, putts, and penalties. Get detailed statistics
                                and insights.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </RadioGroup>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* Round Visibility */}
          <AccordionItem value="visibility" className="border-0">
            <Card className="border-0 shadow-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Round Visibility
                </CardTitle>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <RadioGroup value={visibility} onValueChange={setVisibility}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
                        <RadioGroupItem value="everyone" id="everyone" />
                        <Label htmlFor="everyone" className="flex-1 cursor-pointer">
                          <div className="font-medium">Everyone</div>
                          <div className="text-sm text-muted-foreground">
                            Anyone can see your round
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
                        <RadioGroupItem value="friends" id="friends" />
                        <Label htmlFor="friends" className="flex-1 cursor-pointer">
                          <div className="font-medium">Friends Only</div>
                          <div className="text-sm text-muted-foreground">
                            Only your friends can see
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/10 transition-colors">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="flex-1 cursor-pointer">
                          <div className="font-medium">Private</div>
                          <div className="text-sm text-muted-foreground">
                            Only you can see this round
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>

        {/* Start Round Button */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg py-6"
          onClick={handleStartRound}
          disabled={!selectedConfigId || !selectedTee}
        >
          <Play className="h-6 w-6 mr-2" />
          Start Round
        </Button>
      </div>

      {/* Alert Dialog for Active Round */}
      <AlertDialog open={showActiveRoundDialog} onOpenChange={setShowActiveRoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have an active round</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You already have an active round at:</p>
              <p className="font-semibold text-foreground">
                {existingActiveRound?.courses?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                You can only have one active round at a time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowActiveRoundDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleContinueExisting}
              className="w-full sm:w-auto"
            >
              Continue Existing Round
            </Button>
            <AlertDialogAction
              onClick={handleFinishAndStartNew}
              className="w-full sm:w-auto"
            >
              Finish & Start New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
};

export default StartRoundSettings;
