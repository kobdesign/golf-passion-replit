import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Map, Play, Star, Shield, Settings, Database } from "lucide-react";
import { Link } from "react-router-dom";
import MobileNav from "@/components/MobileNav";

const AdminDashboard = () => {
  // Fetch total users
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ['admin-total-users'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total courses
  const { data: totalCourses = 0 } = useQuery({
    queryKey: ['admin-total-courses'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch active rounds today
  const { data: activeRoundsToday = 0 } = useQuery({
    queryKey: ['admin-active-rounds-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('rounds')
        .select('*', { count: 'exact', head: true })
        .eq('date_played', today);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total reviews
  const { data: totalReviews = 0 } = useQuery({
    queryKey: ['admin-total-reviews'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('course_reviews')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Courses",
      value: totalCourses,
      icon: Map,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Active Rounds Today",
      value: activeRoundsToday,
      icon: Play,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Reviews",
      value: totalReviews,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const quickActions = [
    {
      title: "Manage Users",
      description: "View and manage user roles",
      icon: Users,
      href: "/admin/users",
      color: "text-blue-500",
    },
    {
      title: "Sync Courses",
      description: "Import courses from Google Places",
      icon: Database,
      href: "/sync-courses",
      color: "text-green-500",
    },
    {
      title: "Manage Courses",
      description: "Edit course details and holes",
      icon: Map,
      href: "/courses",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent p-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary-foreground" />
            <h1 className="text-2xl font-bold text-primary-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-primary-foreground/80 mt-2">Manage your golf app</p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} to={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto flex flex-col items-start gap-3 p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Icon className={`h-6 w-6 ${action.color}`} />
                      <span className="font-semibold">{action.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      {action.description}
                    </p>
                  </Button>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
};

export default AdminDashboard;
