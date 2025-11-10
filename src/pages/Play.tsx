import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurrentPosition, calculateDistance as calcDistance, checkPermissions, requestPermissions } from "@/lib/geolocation";
import { Capacitor } from "@capacitor/core";

interface Course {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  location: string | null;
}

type LoadingStage = 
  | "checking-permission"
  | "requesting-permission"
  | "getting-location"
  | "fetching-courses"
  | "calculating-distance";

const Play = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "no-location" | "no-courses">("loading");
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("checking-permission");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const getLoadingMessage = (stage: LoadingStage): string => {
    switch (stage) {
      case "checking-permission":
        return "กำลังตรวจสอบการอนุญาต GPS...";
      case "requesting-permission":
        return "กำลังขออนุญาตใช้งาน GPS...";
      case "getting-location":
        return "กำลังหาตำแหน่งของคุณ...";
      case "fetching-courses":
        return "กำลังค้นหาสนามกอล์ฟ...";
      case "calculating-distance":
        return "กำลังคำนวณสนามที่ใกล้ที่สุด...";
      default:
        return "กำลังประมวลผล...";
    }
  };

  const findNearestCourse = async () => {
    try {
      setStatus("loading");
      setErrorMessage("");
      console.log("[Play] Starting find nearest course, attempt", retryCount + 1);
      
      // Step 1: Check permissions
      setLoadingStage("checking-permission");
      setProgress(10);
      
      if (Capacitor.isNativePlatform()) {
        const permission = await checkPermissions();
        console.log("[Play] Permission status:", permission);
        
        if (permission !== 'granted') {
          setLoadingStage("requesting-permission");
          setProgress(20);
          const granted = await requestPermissions();
          
          if (!granted) {
            console.error("[Play] Permission denied by user");
            setStatus("no-location");
            setErrorMessage("กรุณาอนุญาตการใช้งาน GPS ในการตั้งค่าของอุปกรณ์");
            return;
          }
        }
      }

      // Step 2: Get current location
      setLoadingStage("getting-location");
      setProgress(40);
      console.log("[Play] Getting current position...");
      
      const position = await getCurrentPosition({ timeout: 30000 });
      
      if (!position) {
        console.error("[Play] Failed to get position");
        setStatus("no-location");
        setErrorMessage(
          Capacitor.isNativePlatform()
            ? "ไม่สามารถหาตำแหน่งได้ กรุณาเปิด GPS และลองใหม่อีกครั้ง"
            : "กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ของคุณ"
        );
        return;
      }

      console.log("[Play] Got position:", position.latitude, position.longitude);
      const userLat = position.latitude;
      const userLon = position.longitude;

      // Step 3: Fetch courses
      setLoadingStage("fetching-courses");
      setProgress(60);
      console.log("[Play] Fetching courses from database...");
      
      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, name, latitude, longitude, location")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (error) {
        console.error("[Play] Database error:", error);
        throw error;
      }

      console.log("[Play] Found", courses?.length || 0, "courses with coordinates");

      if (!courses || courses.length === 0) {
        setStatus("no-courses");
        return;
      }

      // Step 4: Calculate nearest course
      setLoadingStage("calculating-distance");
      setProgress(80);
      console.log("[Play] Calculating nearest course...");
      
      let nearestCourse: Course | null = null;
      let minDistance = Infinity;

      courses.forEach((course) => {
        const distance = calcDistance(
          userLat,
          userLon,
          Number(course.latitude),
          Number(course.longitude)
        );

        console.log(`[Play] Distance to ${course.name}: ${(distance/1000).toFixed(2)}km`);

        if (distance < minDistance) {
          minDistance = distance;
          nearestCourse = course as Course;
        }
      });

      setProgress(100);

      if (nearestCourse) {
        console.log(`[Play] Nearest course: ${nearestCourse.name} at ${(minDistance/1000).toFixed(2)}km`);
        // Add small delay to show 100% progress
        setTimeout(() => {
          navigate(`/courses/${nearestCourse.id}`);
        }, 300);
      } else {
        setStatus("no-courses");
      }
    } catch (error) {
      console.error("[Play] Error finding nearest course:", error);
      setStatus("error");
      setErrorMessage("เกิดข้อผิดพลาดในการค้นหาสนาม กรุณาลองใหม่อีกครั้ง");
    }
  };

  useEffect(() => {
    findNearestCourse();
  }, [retryCount]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <MapPin className="h-12 w-12 text-primary animate-pulse" />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="w-full space-y-3">
                <h2 className="text-xl font-semibold">กำลังค้นหาสนามใกล้ที่สุด</h2>
                <p className="text-sm text-muted-foreground animate-pulse">
                  {getLoadingMessage(loadingStage)}
                </p>
                <div className="px-8">
                  <Progress value={progress} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress}% - โปรดรอสักครู่...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "no-location" || status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {status === "error" ? "เกิดข้อผิดพลาด" : "ไม่สามารถหาตำแหน่งได้"}
                </h2>
                <p className="text-muted-foreground mb-4">{errorMessage}</p>
                {status === "error" && (
                  <p className="text-xs text-muted-foreground mb-2">
                    กรุณาตรวจสอบว่าคุณเปิด GPS และอนุญาตการใช้งานตำแหน่งแล้ว
                  </p>
                )}
              </div>
              <div className="w-full space-y-2">
                <Button 
                  onClick={() => setRetryCount(prev => prev + 1)} 
                  className="w-full gap-2"
                  variant={status === "error" ? "default" : "outline"}
                >
                  <RefreshCw className="h-4 w-4" />
                  ลองใหม่อีกครั้ง
                </Button>
                <Button onClick={() => navigate("/courses")} variant="outline" className="w-full">
                  ดูรายการสนามทั้งหมด
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "no-courses") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold mb-2">ไม่พบสนามกอล์ฟ</h2>
                <p className="text-muted-foreground mb-4">
                  ยังไม่มีสนามกอล์ฟที่มีข้อมูลตำแหน่งในระบบ
                </p>
                <p className="text-xs text-muted-foreground">
                  หากมีสนามในระบบ กรุณาเพิ่มพิกัดของสนามก่อน
                </p>
              </div>
              <div className="w-full space-y-2">
                <Button 
                  onClick={() => setRetryCount(prev => prev + 1)} 
                  variant="outline"
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  ลองค้นหาใหม่
                </Button>
                <Button onClick={() => navigate("/courses")} className="w-full">
                  ดูรายการสนามทั้งหมด
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default Play;
