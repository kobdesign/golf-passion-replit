import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2, Save, X, GripVertical, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSubCourseDisplayRange } from "@/lib/courseUtils";

interface SubCourse {
  id: string;
  name: string;
  start_hole: number;
  end_hole: number;
  sequence: number;
}

interface Configuration {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  total_holes: number;
  sub_courses: SubCourse[];
}

interface SubCourseMappingManagerProps {
  courseId: string;
}

interface SortableSubCourseItemProps {
  subCourse: SubCourse;
  allSubCourses: SubCourse[];
  onRemove: () => void;
}

function SortableSubCourseItem({ subCourse, allSubCourses, onRemove }: SortableSubCourseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subCourse.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayRange = getSubCourseDisplayRange(subCourse, allSubCourses);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted rounded-md"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{subCourse.name}</span>
          <span className="text-xs text-muted-foreground">
            DB: Holes {subCourse.start_hole}-{subCourse.end_hole}
          </span>
          <span className="text-xs font-medium text-primary">
            Display: Holes {displayRange.start}-{displayRange.end}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 w-8 p-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SubCourseMappingManager({ courseId }: SubCourseMappingManagerProps) {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [availableSubCourses, setAvailableSubCourses] = useState<SubCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_default: false,
    selectedSubCourses: [] as string[],
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch available sub-courses
      const { data: subCoursesData, error: subCoursesError } = await supabase
        .from("sub_courses")
        .select("*")
        .eq("course_id", courseId)
        .order("sequence");

      if (subCoursesError) throw subCoursesError;
      setAvailableSubCourses(subCoursesData || []);

      // Fetch configurations
      const { data: configurationsData, error: configurationsError } = await supabase
        .from("course_configurations")
        .select("*")
        .eq("course_id", courseId)
        .order("name");

      if (configurationsError) throw configurationsError;

      // Fetch sub-courses for each configuration
      const configurationsWithSubCourses = await Promise.all(
        (configurationsData || []).map(async (config) => {
          const { data: configSubCourses, error } = await supabase
            .from("configuration_sub_courses")
            .select(`
              sequence,
              sub_courses:sub_course_id (
                id,
                name,
                start_hole,
                end_hole,
                sequence
              )
            `)
            .eq("configuration_id", config.id)
            .order("sequence");

          if (error) throw error;

          const subCourses = configSubCourses
            .map((cs: any) => cs.sub_courses)
            .filter(Boolean);

          return {
            ...config,
            sub_courses: subCourses,
          };
        })
      );

      setConfigurations(configurationsWithSubCourses);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      name: "",
      description: "",
      is_default: false,
      selectedSubCourses: [],
    });
  };

  const handleEdit = (config: Configuration) => {
    setEditingId(config.id);
    setFormData({
      name: config.name,
      description: config.description || "",
      is_default: config.is_default,
      selectedSubCourses: config.sub_courses.map((sc) => sc.id),
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      is_default: false,
      selectedSubCourses: [],
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || formData.selectedSubCourses.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please provide a name and select at least one sub-course",
          variant: "destructive",
        });
        return;
      }

      const totalHoles = formData.selectedSubCourses.reduce((sum, scId) => {
        const sc = availableSubCourses.find((s) => s.id === scId);
        return sum + (sc ? sc.end_hole - sc.start_hole + 1 : 0);
      }, 0);

      if (editingId) {
        // Update existing configuration
        const { error: updateError } = await supabase
          .from("course_configurations")
          .update({
            name: formData.name,
            description: formData.description || null,
            is_default: formData.is_default,
            total_holes: totalHoles,
          })
          .eq("id", editingId);

        if (updateError) throw updateError;

        // Delete existing mappings
        const { error: deleteError } = await supabase
          .from("configuration_sub_courses")
          .delete()
          .eq("configuration_id", editingId);

        if (deleteError) throw deleteError;

        // Insert new mappings
        const mappings = formData.selectedSubCourses.map((scId, index) => ({
          configuration_id: editingId,
          sub_course_id: scId,
          sequence: index + 1,
        }));

        const { error: insertError } = await supabase
          .from("configuration_sub_courses")
          .insert(mappings);

        if (insertError) throw insertError;

        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
      } else {
        // Create new configuration
        const { data: newConfig, error: insertError } = await supabase
          .from("course_configurations")
          .insert({
            course_id: courseId,
            name: formData.name,
            description: formData.description || null,
            is_default: formData.is_default,
            total_holes: totalHoles,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert mappings
        const mappings = formData.selectedSubCourses.map((scId, index) => ({
          configuration_id: newConfig.id,
          sub_course_id: scId,
          sequence: index + 1,
        }));

        const { error: mappingError } = await supabase
          .from("configuration_sub_courses")
          .insert(mappings);

        if (mappingError) throw mappingError;

        toast({
          title: "Success",
          description: "Configuration created successfully",
        });
      }

      handleCancel();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("course_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formData.selectedSubCourses.indexOf(active.id as string);
      const newIndex = formData.selectedSubCourses.indexOf(over.id as string);

      setFormData({
        ...formData,
        selectedSubCourses: arrayMove(formData.selectedSubCourses, oldIndex, newIndex),
      });
    }
  };

  const toggleSubCourse = (subCourseId: string) => {
    const selected = formData.selectedSubCourses.includes(subCourseId);
    if (selected) {
      setFormData({
        ...formData,
        selectedSubCourses: formData.selectedSubCourses.filter((id) => id !== subCourseId),
      });
    } else {
      setFormData({
        ...formData,
        selectedSubCourses: [...formData.selectedSubCourses, subCourseId],
      });
    }
  };

  const removeFromSelected = (subCourseId: string) => {
    setFormData({
      ...formData,
      selectedSubCourses: formData.selectedSubCourses.filter((id) => id !== subCourseId),
    });
  };

  const selectedSubCoursesData = formData.selectedSubCourses
    .map((id) => availableSubCourses.find((sc) => sc.id === id))
    .filter(Boolean) as SubCourse[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Course Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Create different play configurations by combining sub-courses
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        )}
      </div>

      {/* Form for adding/editing */}
      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Configuration" : "New Configuration"}</CardTitle>
            <CardDescription>
              Select sub-courses and arrange them in the order they should be played
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Front 9 + Back 9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this configuration"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked as boolean })
                }
              />
              <Label htmlFor="is_default" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Set as default configuration
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Available Sub-Courses</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableSubCourses.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => toggleSubCourse(sc.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.selectedSubCourses.includes(sc.id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{sc.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Holes {sc.start_hole}-{sc.end_hole} ({sc.end_hole - sc.start_hole + 1} holes)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedSubCoursesData.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Sub-Courses (Drag to reorder)</Label>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedSubCoursesData.map((sc) => sc.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedSubCoursesData.map((sc) => (
                        <SortableSubCourseItem
                          key={sc.id}
                          subCourse={sc}
                          allSubCourses={selectedSubCoursesData}
                          onRemove={() => removeFromSelected(sc.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <p className="text-sm text-muted-foreground">
                  Total: {selectedSubCoursesData.reduce((sum, sc) => sum + (sc.end_hole - sc.start_hole + 1), 0)} holes
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List of existing configurations */}
      <div className="grid gap-4">
        {configurations.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{config.name}</CardTitle>
                    {config.is_default && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                  {config.description && (
                    <CardDescription>{config.description}</CardDescription>
                  )}
                </div>
                {!isAdding && !editingId && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Total Holes: {config.total_holes}
                </div>
                <div className="space-y-1">
                  {config.sub_courses.map((sc, index) => (
                    <div
                      key={sc.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge variant="outline">{index + 1}</Badge>
                      <span>{sc.name}</span>
                      <span className="text-muted-foreground">
                        (Holes {sc.start_hole}-{sc.end_hole})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {configurations.length === 0 && !isAdding && !editingId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No configurations yet. Click "Add Configuration" to create one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
