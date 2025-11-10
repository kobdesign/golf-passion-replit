import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubCourse {
  id: string;
  name: string;
  description: string | null;
  sequence: number;
  start_hole: number;
  end_hole: number;
}

interface SubCourseManagerProps {
  courseId: string;
  subCourses: SubCourse[];
  onUpdate: () => void;
}

const SubCourseManager = ({ courseId, subCourses, onUpdate }: SubCourseManagerProps) => {
  const { toast } = useToast();
  const [editingSubCourse, setEditingSubCourse] = useState<SubCourse | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sequence: 1,
    start_hole: 1,
    end_hole: 9,
  });

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      name: "",
      description: "",
      sequence: subCourses.length + 1,
      start_hole: subCourses.length > 0 ? subCourses[subCourses.length - 1].end_hole + 1 : 1,
      end_hole: subCourses.length > 0 ? subCourses[subCourses.length - 1].end_hole + 9 : 9,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingSubCourse) {
        // Update
        const { error } = await supabase
          .from("sub_courses")
          .update({
            name: formData.name,
            description: formData.description,
            sequence: formData.sequence,
            start_hole: formData.start_hole,
            end_hole: formData.end_hole,
          })
          .eq("id", editingSubCourse.id);

        if (error) throw error;
        toast({ title: "อัปเดตสำเร็จ", description: "อัปเดท Sub-course เรียบร้อย" });
      } else {
        // Insert
        const { error } = await supabase.from("sub_courses").insert({
          course_id: courseId,
          name: formData.name,
          description: formData.description,
          sequence: formData.sequence,
          start_hole: formData.start_hole,
          end_hole: formData.end_hole,
        });

        if (error) throw error;
        toast({ title: "เพิ่มสำเร็จ", description: "เพิ่ม Sub-course เรียบร้อย" });
      }

      setIsAdding(false);
      setEditingSubCourse(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ Sub-course นี้?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("sub_courses").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "ลบสำเร็จ", description: "ลบ Sub-course เรียบร้อย" });
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

  const handleEdit = (subCourse: SubCourse) => {
    setEditingSubCourse(subCourse);
    setIsAdding(true);
    setFormData({
      name: subCourse.name,
      description: subCourse.description || "",
      sequence: subCourse.sequence,
      start_hole: subCourse.start_hole,
      end_hole: subCourse.end_hole,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sub-Courses</CardTitle>
        <CardDescription>
          จัดการ Course ย่อย เช่น Front 9, Back 9 หรือ A/B/C Course
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List of sub-courses */}
        <div className="space-y-2">
          {subCourses.map((subCourse) => (
            <div
              key={subCourse.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{subCourse.name}</div>
                  <div className="text-sm text-muted-foreground">
                    หลุมที่ {subCourse.start_hole} - {subCourse.end_hole}
                    {subCourse.description && ` • ${subCourse.description}`}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(subCourse)}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(subCourse.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add button */}
        {!isAdding && (
          <Button variant="outline" onClick={handleAdd} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่ม Sub-Course
          </Button>
        )}

        {/* Add/Edit form */}
        {isAdding && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>ชื่อ Sub-Course</Label>
              <Input
                placeholder="เช่น Front 9, Back 9, Course A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>คำอธิบาย (ไม่จำเป็น)</Label>
              <Textarea
                placeholder="รายละเอียดเพิ่มเติม"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ลำดับ</Label>
                <Input
                  type="number"
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>หลุมเริ่มต้น</Label>
                <Input
                  type="number"
                  value={formData.start_hole}
                  onChange={(e) => setFormData({ ...formData, start_hole: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>หลุมสุดท้าย</Label>
                <Input
                  type="number"
                  value={formData.end_hole}
                  onChange={(e) => setFormData({ ...formData, end_hole: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading || !formData.name} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {editingSubCourse ? "อัปเดต" : "บันทึก"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setEditingSubCourse(null);
                }}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubCourseManager;
