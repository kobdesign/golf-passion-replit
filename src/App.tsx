import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Play = lazy(() => import("./pages/Play"));
const PreviewCourse = lazy(() => import("./pages/PreviewCourse"));
const PreviewHole = lazy(() => import("./pages/PreviewHole"));
const StartRoundSettings = lazy(() => import("./pages/StartRoundSettings"));
const HoleMap = lazy(() => import("./pages/HoleMap"));
const RoundSummary = lazy(() => import("./pages/RoundSummary"));
const ScorecardFullscreen = lazy(() => import("./pages/ScorecardFullscreen"));
const Stats = lazy(() => import("./pages/Stats"));
const SocialFeed = lazy(() => import("./pages/SocialFeed"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const Friends = lazy(() => import("./pages/Friends"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const CourseReviews = lazy(() => import("./pages/CourseReviews"));
const RoundHistory = lazy(() => import("./pages/RoundHistory"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SyncCourses = lazy(() => import("./pages/SyncCourses"));
const AdminCourseManagement = lazy(() => import("./pages/AdminCourseManagement"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("./pages/AdminUserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/courses" element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } />
            <Route path="/courses/:id" element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/play" element={
              <ProtectedRoute>
                <Play />
              </ProtectedRoute>
            } />
            <Route path="/courses/:id/preview" element={
              <ProtectedRoute>
                <PreviewCourse />
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/preview-hole/:holeNumber" element={
              <ProtectedRoute>
                <PreviewHole />
              </ProtectedRoute>
            } />
            <Route path="/courses/:id/start-round" element={
              <ProtectedRoute>
                <StartRoundSettings />
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/hole/:holeNumber" element={
              <ProtectedRoute>
                <HoleMap />
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/round-summary" element={
              <ProtectedRoute>
                <RoundSummary />
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/scorecard" element={
              <ProtectedRoute>
                <ScorecardFullscreen />
              </ProtectedRoute>
            } />
            <Route path="/stats" element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            } />
            <Route path="/stats/:courseId" element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            } />
            <Route path="/social-feed" element={
              <ProtectedRoute>
                <SocialFeed />
              </ProtectedRoute>
            } />
            <Route path="/create-post" element={
              <ProtectedRoute>
                <CreatePost />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard/:id" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/edit-profile" element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <Friends />
              </ProtectedRoute>
            } />
            <Route path="/bookmarks" element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            } />
            <Route path="/course-reviews" element={
              <ProtectedRoute>
                <CourseReviews />
              </ProtectedRoute>
            } />
            <Route path="/round-history" element={
              <ProtectedRoute>
                <RoundHistory />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUserManagement />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/courses/:courseId" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminCourseManagement />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/sync-courses" element={
              <ProtectedRoute>
                <AdminRoute>
                  <SyncCourses />
                </AdminRoute>
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
