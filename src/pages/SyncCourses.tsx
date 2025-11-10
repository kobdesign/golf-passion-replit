import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SyncCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-places", {
        body: {
          query: searchQuery,
        },
      });

      if (error) throw error;

      setSyncResult(data);
      toast({
        title: "Sync สำเร็จ!",
        description: `นำเข้า ${data.synced.courses} สนามจากประเทศไทย`,
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถ sync ข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-xl font-bold">Sync Golf Courses</h1>
            <p className="text-sm text-muted-foreground">
              นำเข้าข้อมูลสนามจาก Google Places API (ไทย)
            </p>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ค้นหาและ Sync สนามกอล์ฟในไทย</CardTitle>
            <CardDescription>
              ระบุชื่อสนามหรือพื้นที่ที่ต้องการค้นหาจาก Google Places
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">ชื่อสนามหรือพื้นที่ (บังคับ)</Label>
              <Input
                id="search"
                placeholder="เช่น Alpine, Siam Country Club, Bangkok"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ระบุชื่อสนามกอล์ฟหรือพื้นที่ในประเทศไทย
              </p>
            </div>

            <Button
              onClick={handleSync}
              disabled={loading || !searchQuery}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-spin" />
                  กำลัง Sync...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  เริ่ม Sync ข้อมูล
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    กำลังดึงข้อมูลจาก Google Places API...
                  </span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {syncResult && (
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle>Sync สำเร็จ!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">สนามกอล์ฟในไทย</p>
                <p className="text-2xl font-bold">{syncResult.synced.courses}</p>
              </div>

              <Button
                onClick={() => navigate("/courses")}
                variant="outline"
                className="w-full"
              >
                ดูสนามที่นำเข้า
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">หมายเหตุสำคัญ</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Google Places API จะค้นหาสนามกอล์ฟในประเทศไทยเท่านั้น
            </p>
            <p>
              • ข้อมูลที่ได้จะมีชื่อสนาม, ที่อยู่, GPS coordinates, รูปภาพ
            </p>
            <p>
              • <strong>ข้อมูลหลุมต้องเพิ่มเองโดย Admin</strong> ผ่านหน้าจัดการสนาม
            </p>
            <p>
              • ใช้หน้า Admin เพื่อเพิ่ม Tee/Pin Position, Hazards, ระยะกรีน
            </p>
            <p>
              • API Key ถูกเก็บอย่างปลอดภัยใน Lovable Cloud
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SyncCourses;
