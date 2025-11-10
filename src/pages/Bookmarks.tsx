import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, MapPin, Loader2, Star, ArrowLeft } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface BookmarkedCourse {
  id: string;
  course_id: string;
  courses: {
    id: string;
    name: string;
    image_url: string | null;
    total_holes: number | null;
    location: string | null;
    description: string | null;
    total_par: number;
    average_rating: number | null;
    total_reviews: number | null;
  };
}

const Bookmarks = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: { user } = {} } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    },
  });

  const { data: bookmarkedCourses, isLoading } = useQuery({
    queryKey: ['bookmarked-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('course_bookmarks')
        .select(`
          id,
          course_id,
          courses (
            id,
            name,
            image_url,
            total_holes,
            location,
            description,
            total_par,
            average_rating,
            total_reviews
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BookmarkedCourse[];
    },
    enabled: !!user,
  });

  const removeBookmark = async (courseId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('course_bookmarks')
        .delete()
        .eq('course_id', courseId)
        .eq('user_id', user.id);
      
      toast({
        title: "Bookmark Removed",
        description: "Course removed from your bookmarks.",
      });

      queryClient.invalidateQueries({ queryKey: ['bookmarked-courses', user.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user.id] });
    } catch (error: any) {
      console.error("Error removing bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center pb-24">
        <div className="text-center space-y-4">
          <Bookmark className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="text-muted-foreground">Please login to view your bookmarked courses.</p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Bookmarks
            </h1>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading bookmarks...</p>
          </div>
        ) : !bookmarkedCourses || bookmarkedCourses.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No bookmarks yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start bookmarking your favorite courses!
            </p>
            <Button 
              className="mt-6"
              onClick={() => navigate("/courses")}
            >
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedCourses.map((bookmark) => {
              const course = bookmark.courses;
              return (
                <Card
                  key={bookmark.id}
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-card"
                >
                  <Link to={`/courses/${course.id}`}>
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeBookmark(course.id);
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-card/90 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:scale-110"
                      >
                        <Bookmark className="h-5 w-5 fill-primary text-primary" />
                      </button>
                    </div>
                  </Link>

                  <CardContent className="p-4 space-y-3">
                    <Link to={`/courses/${course.id}`}>
                      <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{course.location || "Unknown location"}</span>
                    </div>

                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{course.total_holes || 18} Holes</p>
                        <p className="text-xs text-muted-foreground">
                          Par {course.total_par}
                        </p>
                      </div>
                      {course.average_rating && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {course.average_rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
};

export default Bookmarks;
