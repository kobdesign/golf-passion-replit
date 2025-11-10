import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeeTypeManagerProps {
  courseId: string;
  availableTeeTypes: string[];
  onUpdate: () => void;
}

const TEE_TYPES = [
  { value: 'black', label: 'Black Tee', color: '#000000' },
  { value: 'blue', label: 'Blue Tee', color: '#3B82F6' },
  { value: 'white', label: 'White Tee', color: '#FFFFFF' },
  { value: 'yellow', label: 'Yellow Tee', color: '#FCD34D' },
  { value: 'red', label: 'Red Tee', color: '#EF4444' },
];

const TeeTypeManager = ({ courseId, availableTeeTypes, onUpdate }: TeeTypeManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(availableTeeTypes || []);

  const handleToggle = (teeValue: string) => {
    setSelectedTypes(prev => 
      prev.includes(teeValue)
        ? prev.filter(t => t !== teeValue)
        : [...prev, teeValue]
    );
  };

  const handleSave = async () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "กรุณาเลือกอย่างน้อย 1 Tee",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ available_tee_types: selectedTypes as ('black' | 'blue' | 'white' | 'yellow' | 'red')[] })
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดท Tee Types เรียบร้อย",
      });
      onUpdate();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tee Types Configuration
        </CardTitle>
        <CardDescription>
          เลือก Tee Types ที่มีในสนามนี้ (จะใช้สำหรับกำหนดในแต่ละหลุม)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {TEE_TYPES.map(teeType => (
            <div key={teeType.value} className="flex items-center space-x-3">
              <Checkbox
                id={teeType.value}
                checked={selectedTypes.includes(teeType.value)}
                onCheckedChange={() => handleToggle(teeType.value)}
              />
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: teeType.color,
                    border: teeType.value === 'white' ? '2px solid #000' : '2px solid #fff',
                  }}
                />
                <Label htmlFor={teeType.value} className="cursor-pointer">
                  {teeType.label}
                </Label>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          บันทึก Tee Types
        </Button>
      </CardContent>
    </Card>
  );
};

export default TeeTypeManager;
