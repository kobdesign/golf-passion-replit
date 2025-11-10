import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import HoleMapEditor from "@/components/admin/HoleMapEditor";
import TeeTypeManager from "@/components/admin/TeeTypeManager";
import SubCourseManager from "@/components/admin/SubCourseManager";
import { SubCourseMappingManager } from "@/components/admin/SubCourseMappingManager";

interface Hazard {
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
}

interface TeePosition {
  id: string;
  hole_id: string;
  tee_type: 'black' | 'blue' | 'white' | 'yellow' | 'red';
  latitude: number;
  longitude: number;
  distance_to_pin: number;
}

interface SubCourse {
  id: string;
  name: string;
  description: string | null;
  sequence: number;
  start_hole: number;
  end_hole: number;
}

interface Hole {
  id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  distance_yards: number;
  tee_latitude: number | null;
  tee_longitude: number | null;
  pin_latitude: number | null;
  pin_longitude: number | null;
  target_latitude: number | null;
  target_longitude: number | null;
  green_front_distance: number | null;
  green_middle_distance: number | null;
  green_back_distance: number | null;
  hazards: Hazard[];
  notes: string | null;
  sub_course_id: string | null;
  tee_positions?: TeePosition[];
}

const AdminCourseManagement = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [subCourses, setSubCourses] = useState<SubCourse[]>([]);
  const [teePositions, setTeePositions] = useState<TeePosition[]>([]);
  const [selectedSubCourseId, setSelectedSubCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseAndHoles();
    }
  }, [courseId]);

  const fetchCourseAndHoles = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: holesData, error: holesError } = await supabase
        .from("holes")
        .select("*")
        .eq("course_id", courseId)
        .order("hole_number");

      if (holesError) throw holesError;
      
      const typedHoles = (holesData || []).map(hole => ({
        ...hole,
        hazards: Array.isArray(hole.hazards) ? (hole.hazards as unknown as Hazard[]) : [],
        tee_latitude: hole.tee_latitude ? Number(hole.tee_latitude) : null,
        tee_longitude: hole.tee_longitude ? Number(hole.tee_longitude) : null,
        pin_latitude: hole.pin_latitude ? Number(hole.pin_latitude) : null,
        pin_longitude: hole.pin_longitude ? Number(hole.pin_longitude) : null,
      } as unknown as Hole));
      
      setHoles(typedHoles);
      
      // Keep the currently selected hole if it exists, otherwise select the first hole
      if (typedHoles.length > 0) {
        if (selectedHole) {
          const updatedSelectedHole = typedHoles.find(h => h.id === selectedHole.id);
          if (updatedSelectedHole) {
            setSelectedHole(updatedSelectedHole);
          } else {
            setSelectedHole(typedHoles[0]);
          }
        } else {
          setSelectedHole(typedHoles[0]);
        }
      }

      // Fetch sub-courses
      const { data: subCoursesData, error: subCoursesError } = await supabase
        .from("sub_courses")
        .select("*")
        .eq("course_id", courseId)
        .order("sequence");

      if (subCoursesError) throw subCoursesError;
      setSubCourses(subCoursesData || []);
      
      // Set first sub-course as selected if available and auto-select first hole in that sub-course
      if (subCoursesData && subCoursesData.length > 0) {
        const firstSubCourse = subCoursesData[0];
        if (!selectedSubCourseId) {
          setSelectedSubCourseId(firstSubCourse.id);
        }
        
        // Auto-select first hole of the first sub-course if no hole is selected
        if (!selectedHole && typedHoles.length > 0) {
          const firstSubCourseHole = typedHoles.find(h => h.sub_course_id === firstSubCourse.id);
          if (firstSubCourseHole) {
            setSelectedHole(firstSubCourseHole);
          }
        }
      }

      // Fetch tee positions for all holes
      if (holesData && holesData.length > 0) {
        const holeIds = holesData.map(h => h.id);
        const { data: teeData, error: teeError } = await supabase
          .from("tee_positions")
          .select("*")
          .in("hole_id", holeIds);

        if (teeError) throw teeError;
        setTeePositions(teeData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateCourse = async (updates: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดทข้อมูลสนามเรียบร้อย",
      });

      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHole = async (holeId: string, updates: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("holes")
        .update(updates)
        .eq("id", holeId);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดทข้อมูลหลุมเรียบร้อย",
      });

      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createHolesForSubCourse = async (subCourseId: string) => {
    setLoading(true);
    try {
      const subCourse = subCourses.find(sc => sc.id === subCourseId);
      if (!subCourse) return;

      // Check existing holes for this course
      const { data: existingHoles, error: fetchError } = await supabase
        .from("holes")
        .select("hole_number")
        .eq("course_id", courseId)
        .gte("hole_number", subCourse.start_hole)
        .lte("hole_number", subCourse.end_hole);

      if (fetchError) throw fetchError;

      const existingHoleNumbers = new Set(existingHoles?.map(h => h.hole_number) || []);
      const holeCount = subCourse.end_hole - subCourse.start_hole + 1;
      
      // Prepare holes to insert (only those that don't exist)
      const newHoles = [];
      const holeNumbersToUpdate = [];
      
      for (let i = 0; i < holeCount; i++) {
        const holeNumber = subCourse.start_hole + i;
        if (existingHoleNumbers.has(holeNumber)) {
          holeNumbersToUpdate.push(holeNumber);
        } else {
          newHoles.push({
            course_id: courseId,
            hole_number: holeNumber,
            par: 4,
            distance_yards: 400,
            hazards: [],
            sub_course_id: subCourseId,
          });
        }
      }

      // Insert new holes
      if (newHoles.length > 0) {
        const { error: insertError } = await supabase.from("holes").insert(newHoles);
        if (insertError) throw insertError;
      }

      // Update existing holes to link them to this sub-course
      if (holeNumbersToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("holes")
          .update({ sub_course_id: subCourseId })
          .eq("course_id", courseId)
          .in("hole_number", holeNumbersToUpdate);

        if (updateError) throw updateError;
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: `จัดการหลุม ${subCourse.start_hole}-${subCourse.end_hole} สำหรับ ${subCourse.name} เรียบร้อย`,
      });

      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Tee position handlers
  const handleTeeAdd = async (holeId: string, teeType: TeePosition['tee_type'], lat: number, lng: number) => {
    if (!selectedHole?.pin_latitude || !selectedHole?.pin_longitude) {
      toast({
        title: "กรุณาวาง Pin ก่อน",
        description: "ต้องมีตำแหน่ง Pin เพื่อคำนวณระยะทาง",
        variant: "destructive",
      });
      return;
    }

    // Calculate distance from tee to pin
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat * Math.PI / 180;
    const φ2 = selectedHole.pin_latitude * Math.PI / 180;
    const Δφ = (selectedHole.pin_latitude - lat) * Math.PI / 180;
    const Δλ = (selectedHole.pin_longitude - lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceMeters = R * c;
    const distanceYards = Math.round(distanceMeters * 1.09361);

    try {
      const { error } = await supabase
        .from("tee_positions")
        .insert({
          hole_id: holeId,
          tee_type: teeType,
          latitude: lat,
          longitude: lng,
          distance_to_pin: distanceYards,
        });

      if (error) throw error;

      toast({ title: "เพิ่ม Tee สำเร็จ" });
      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeeUpdate = async (teeId: string, lat: number, lng: number, distance: number) => {
    try {
      const { error } = await supabase
        .from("tee_positions")
        .update({
          latitude: lat,
          longitude: lng,
          distance_to_pin: distance,
        })
        .eq("id", teeId);

      if (error) throw error;
      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTeeDelete = async (teeId: string) => {
    try {
      const { error } = await supabase.from("tee_positions").delete().eq("id", teeId);
      if (error) throw error;
      
      toast({ title: "ลบ Tee สำเร็จ" });
      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePinUpdate = async (holeId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from("holes")
        .update({
          pin_latitude: lat,
          pin_longitude: lng,
        })
        .eq("id", holeId);

      if (error) throw error;
      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTargetUpdate = async (holeId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from("holes")
        .update({
          target_latitude: lat,
          target_longitude: lng,
        })
        .eq("id", holeId);

      if (error) throw error;
      fetchCourseAndHoles();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/courses")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">จัดการสนาม</h1>
            <p className="text-sm text-muted-foreground">{course.name}</p>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        <Tabs defaultValue="course" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="course">ข้อมูลสนาม</TabsTrigger>
            <TabsTrigger value="subcourses">Sub-Courses</TabsTrigger>
            <TabsTrigger value="mapping">Sub-Course Mapping</TabsTrigger>
            <TabsTrigger value="holes">จัดการหลุม</TabsTrigger>
          </TabsList>

          <TabsContent value="course" className="space-y-4">
            <TeeTypeManager
              courseId={courseId!}
              availableTeeTypes={course.available_tee_types || ['black', 'blue', 'white', 'yellow', 'red']}
              onUpdate={fetchCourseAndHoles}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>สถานะสนาม</CardTitle>
                <CardDescription>จัดการการแสดงผลของสนามในหน้ารายการ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base">สถานะการแสดงผล</Label>
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.is_active 
                        ? "สนามจะแสดงในหน้ารายการสนามและผู้ใช้สามารถเข้าถึงได้" 
                        : "สนามจะถูกซ่อนจากผู้ใช้ทั่วไป แต่ยังคงข้อมูลทั้งหมดไว้"}
                    </p>
                  </div>
                  <Switch
                    checked={course.is_active ?? true}
                    onCheckedChange={(checked) => {
                      setCourse({ ...course, is_active: checked });
                      updateCourse({ is_active: checked });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลทั่วไป</CardTitle>
                <CardDescription>แก้ไขข้อมูลพื้นฐานของสนาม</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ชื่อสนาม</Label>
                  <Input
                    value={course.name}
                    onChange={(e) => setCourse({ ...course, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>สถานที่</Label>
                  <Input
                    value={course.location || ""}
                    onChange={(e) => setCourse({ ...course, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>คำอธิบาย</Label>
                  <Textarea
                    value={course.description || ""}
                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนหลุม</Label>
                    <Input
                      type="number"
                      value={course.total_holes}
                      onChange={(e) => setCourse({ ...course, total_holes: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Par</Label>
                    <Input
                      type="number"
                      value={course.total_par}
                      onChange={(e) => setCourse({ ...course, total_par: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => updateCourse(course)}
                  disabled={loading}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  บันทึกข้อมูลสนาม
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcourses" className="space-y-4">
            <SubCourseManager
              courseId={courseId!}
              subCourses={subCourses}
              onUpdate={fetchCourseAndHoles}
            />
          </TabsContent>

          <TabsContent value="mapping" className="space-y-4">
            <SubCourseMappingManager courseId={courseId!} />
          </TabsContent>

          <TabsContent value="holes" className="space-y-4">
            {subCourses.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>ยังไม่มี Sub-Courses</CardTitle>
                  <CardDescription>
                    กรุณาสร้าง Sub-Courses ก่อนเพื่อจัดการหลุม
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>เลือก Sub-Course</CardTitle>
                    <CardDescription>จัดการหลุมทีละ Sub-Course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedSubCourseId || ""}
                      onValueChange={(value) => {
                        setSelectedSubCourseId(value);
                        // Auto-select first hole of the new sub-course
                        const firstHoleInSubCourse = holes.find(h => h.sub_course_id === value);
                        setSelectedHole(firstHoleInSubCourse || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก Sub-Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCourses.map((sc) => (
                          <SelectItem key={sc.id} value={sc.id}>
                            {sc.name} (หลุม {sc.start_hole}-{sc.end_hole})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedSubCourseId && (() => {
                  const selectedSubCourse = subCourses.find(sc => sc.id === selectedSubCourseId);
                  const subCourseHoles = holes.filter(h => h.sub_course_id === selectedSubCourseId);
                  const expectedHoleCount = selectedSubCourse ? 
                    selectedSubCourse.end_hole - selectedSubCourse.start_hole + 1 : 0;

                  if (subCourseHoles.length === 0) {
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle>ยังไม่มีหลุมใน {selectedSubCourse?.name}</CardTitle>
                          <CardDescription>
                            สร้างหลุม {selectedSubCourse?.start_hole}-{selectedSubCourse?.end_hole} ({expectedHoleCount} หลุม)
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => createHolesForSubCourse(selectedSubCourseId)} 
                            disabled={loading} 
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            สร้างหลุมสำหรับ {selectedSubCourse?.name}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <>
                      <div className="grid grid-cols-6 gap-2">
                        {subCourseHoles.map((hole) => (
                          <Button
                            key={hole.id}
                            variant={selectedHole?.id === hole.id ? "default" : "outline"}
                            onClick={() => setSelectedHole(hole)}
                            className="h-12"
                          >
                            {hole.hole_number}
                          </Button>
                        ))}
                      </div>

                      {selectedHole && (
                  <>
                    <HoleMapEditor
                      key={selectedHole.id}
                      holeNumber={selectedHole.hole_number}
                      holeId={selectedHole.id}
                      centerLat={course.latitude}
                      centerLng={course.longitude}
                      pinPosition={
                        selectedHole.pin_latitude && selectedHole.pin_longitude
                          ? {
                              latitude: selectedHole.pin_latitude,
                              longitude: selectedHole.pin_longitude,
                            }
                          : null
                      }
                      targetPosition={
                        selectedHole.target_latitude && selectedHole.target_longitude
                          ? {
                              latitude: selectedHole.target_latitude,
                              longitude: selectedHole.target_longitude,
                            }
                          : null
                      }
                      teePositions={teePositions
                        .filter((t) => t.hole_id === selectedHole.id)
                        .map((t) => ({
                          id: t.id,
                          type: t.tee_type,
                          latitude: Number(t.latitude),
                          longitude: Number(t.longitude),
                          distance: t.distance_to_pin,
                        }))}
                      availableTeeTypes={course.available_tee_types || ['black', 'blue', 'white', 'yellow', 'red']}
                      onPinUpdate={(lat, lng) => handlePinUpdate(selectedHole.id, lat, lng)}
                      onTargetUpdate={(lat, lng) => handleTargetUpdate(selectedHole.id, lat, lng)}
                      onTeeAdd={(type, lat, lng) => handleTeeAdd(selectedHole.id, type, lat, lng)}
                      onTeeUpdate={handleTeeUpdate}
                      onTeeDelete={handleTeeDelete}
                    />

                    <Card>
                      <CardHeader>
                        <CardTitle>หลุมที่ {selectedHole.hole_number}</CardTitle>
                        <CardDescription>ข้อมูลเพิ่มเติมของหลุม</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Par</Label>
                            <Input
                              type="number"
                              value={selectedHole.par}
                              onChange={(e) =>
                                setSelectedHole({
                                  ...selectedHole,
                                  par: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Handicap</Label>
                            <Input
                              type="number"
                              value={selectedHole.handicap_index || ""}
                              onChange={(e) =>
                                setSelectedHole({
                                  ...selectedHole,
                                  handicap_index: e.target.value ? parseInt(e.target.value) : null,
                                })
                              }
                              placeholder="1-18"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ระยะทาง (yards)</Label>
                            <Input
                              type="number"
                              value={selectedHole.distance_yards}
                              onChange={(e) =>
                                setSelectedHole({
                                  ...selectedHole,
                                  distance_yards: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        {subCourses.length > 0 && (
                          <div className="space-y-2">
                            <Label>Sub-Course</Label>
                            <Select
                              value={selectedHole.sub_course_id || "none"}
                              onValueChange={(value) =>
                                setSelectedHole({
                                  ...selectedHole,
                                  sub_course_id: value === "none" ? null : value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือก Sub-Course" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ไม่ระบุ</SelectItem>
                                {subCourses.map((sc) => (
                                  <SelectItem key={sc.id} value={sc.id}>
                                    {sc.name} (หลุม {sc.start_hole}-{sc.end_hole})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>หมายเหตุ</Label>
                          <Textarea
                            value={selectedHole.notes || ""}
                            onChange={(e) =>
                              setSelectedHole({
                                ...selectedHole,
                                notes: e.target.value,
                              })
                            }
                            rows={3}
                            placeholder="เช่น dogleg ซ้าย, มีน้ำด้านขวา"
                          />
                        </div>

                        <Button
                          onClick={() => updateHole(selectedHole.id, selectedHole)}
                          disabled={loading}
                          className="w-full"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          บันทึกข้อมูลหลุม
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            );
          })()}
        </>
      )}
    </TabsContent>
  </Tabs>
</div>
    </div>
  );
};

export default AdminCourseManagement;
