import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Star, MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MobileNav from "@/components/MobileNav";

interface CourseReview {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  course_id: string;
  courses: {
    id: string;
    name: string;
    location: string | null;
  } | null;
}

const CourseReviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: reviews, isLoading } = useQuery<CourseReview[]>({
    queryKey: ['user-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          course_id,
          courses (
            id,
            name,
            location
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">My Course Reviews</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-4 max-w-4xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : reviews && reviews.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground text-center">
                No reviews yet
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Start reviewing courses to help other golfers!
              </p>
              <Button
                onClick={() => navigate("/courses")}
                className="mt-4"
              >
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          reviews?.map((review) => (
            <Card key={review.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">
                      {review.courses?.name || 'Unknown Course'}
                    </h3>
                    {review.courses?.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {review.courses.location}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.review_text && (
                  <p className="text-muted-foreground">{review.review_text}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/courses/${review.course_id}`)}
                  >
                    View Course
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <MobileNav />
    </div>
  );
};

export default CourseReviews;
