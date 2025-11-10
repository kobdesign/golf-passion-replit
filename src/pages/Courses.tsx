import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Bookmark, MapPin, Download, Star, MapPinned, Navigation } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import { useNavigate } from "react-router-dom";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useIsAdmin } from "@/hooks/useUserRole";
import CourseCardSkeleton from "@/components/skeletons/CourseCardSkeleton";
import { getCurrentPosition, calculateDistance } from "@/lib/geolocation";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  name: string;
  image_url: string | null;
  total_holes: number | null;
  location: string | null;
  description: string | null;
  total_par: number;
  is_active: boolean;
  average_rating: number | null;
  total_reviews: number | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number; // Added for storing calculated distance
}

const Courses = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);

  const { data: isAdmin } = useIsAdmin();
  const { isBookmarked, toggleBookmark: handleToggleBookmark, isLoading: bookmarksLoading } = useBookmarks();

  // Fetch user location on component mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      setIsGettingLocation(true);
      setLocationError(null);
      
      console.log("[Courses] Getting user location...");
      
      try {
        const position = await getCurrentPosition({ timeout: 10000 }); // 10 seconds timeout
        
        if (position) {
          console.log("[Courses] Got user location:", position.latitude, position.longitude);
          setUserLocation({
            latitude: position.latitude,
            longitude: position.longitude
          });
        } else {
          console.log("[Courses] Could not get user location");
          setLocationError("ไม่สามารถหาตำแหน่งของคุณได้");
        }
      } catch (error) {
        console.error("[Courses] Error getting location:", error);
        setLocationError("ไม่สามารถหาตำแหน่งของคุณได้");
      } finally {
        setIsGettingLocation(false);
      }
    };

    fetchUserLocation();
  }, []);

  const { data: courses, isLoading: coursesLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as Course[];
    }
  });

  const toggleBookmark = (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleToggleBookmark(courseId);
  };

  const isLoading = coursesLoading || bookmarksLoading;

  // Calculate distance for each course and sort
  const processedCourses = (courses || []).map(course => {
    if (userLocation && course.latitude && course.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        course.latitude,
        course.longitude
      );
      return { ...course, distance };
    }
    return course;
  }).sort((a, b) => {
    // Sort by distance if both have distances
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    // If only one has distance, it comes first
    if (a.distance !== undefined) return -1;
    if (b.distance !== undefined) return 1;
    // Otherwise sort by name
    return a.name.localeCompare(b.name);
  });

  const filteredCourses = processedCourses.filter((course) => {
    const matchesSearch = course.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    const matchesBookmark = !showBookmarksOnly || isBookmarked(course.id);
    
    return matchesSearch && matchesBookmark;
  });

  const formatDistance = (meters: number | undefined) => {
    if (!meters) return null;
    
    if (meters < 1000) {
      return `${Math.round(meters)} ม.`;
    } else {
      return `${(meters / 1000).toFixed(1)} กม.`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Golf Courses
            </h1>
            {isAdmin && (
              <Button
                onClick={() => navigate("/sync-courses")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Sync API</span>
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 transition-all duration-300 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                variant={showBookmarksOnly ? "default" : "outline"}
                size="sm"
                className="gap-2 transition-all"
              >
                <Bookmark className={cn(
                  "h-4 w-4",
                  showBookmarksOnly && "fill-current"
                )} />
                บุ๊กมาร์กของฉัน
              </Button>

              {isGettingLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4 animate-pulse" />
                  <span>กำลังหาตำแหน่ง...</span>
                </div>
              )}

              {!isGettingLocation && userLocation && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Navigation className="h-4 w-4" />
                  <span>เรียงตามระยะทาง</span>
                </div>
              )}

              {!isGettingLocation && locationError && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPinned className="h-4 w-4" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 pt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <CourseCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-xl text-destructive">Error loading courses</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try again later
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No courses found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery ? "Try adjusting your search query" : "No courses available yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
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
                      onClick={(e) => toggleBookmark(course.id, e)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-card/90 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:scale-110"
                    >
                      <Bookmark
                        className={`h-5 w-5 transition-all duration-300 ${
                          isBookmarked(course.id)
                            ? "fill-primary text-primary"
                            : "text-foreground"
                        }`}
                      />
                    </button>
                  </div>
                </Link>

                <CardContent className="p-4 space-y-3">
                  <Link to={`/courses/${course.id}`}>
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {course.name}
                    </h3>
                  </Link>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{course.location || "Unknown location"}</span>
                    </div>

                    {course.distance !== undefined && (
                      <div className="flex items-center gap-1 text-sm">
                        <Navigation className="h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">
                          {formatDistance(course.distance)}
                        </span>
                        <span className="text-muted-foreground">จากตำแหน่งของคุณ</span>
                      </div>
                    )}
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
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
};

export default Courses;
