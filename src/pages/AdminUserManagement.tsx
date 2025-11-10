import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Shield, ShieldAlert, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import MobileNav from "@/components/MobileNav";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  role: 'admin' | 'moderator' | 'user';
}

const AdminUserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch all profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, full_name, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch all user roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      return data as { user_id: string; role: 'admin' | 'moderator' | 'user' }[];
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: "Success",
        description: "Role added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'moderator' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: "Success",
        description: "Role removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getUserRoles = (userId: string): ('admin' | 'moderator')[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => ur.role)
      .filter(role => role === 'admin' || role === 'moderator') as ('admin' | 'moderator')[];
  };

  const hasRole = (userId: string, role: 'admin' | 'moderator'): boolean => {
    return getUserRoles(userId).includes(role);
  };

  const toggleRole = (userId: string, role: 'admin' | 'moderator') => {
    // Prevent removing admin role from self
    if (userId === currentUser?.id && role === 'admin' && hasRole(userId, 'admin')) {
      toast({
        title: "Cannot remove your own admin role",
        description: "You cannot demote yourself from admin.",
        variant: "destructive",
      });
      return;
    }

    if (hasRole(userId, role)) {
      removeRoleMutation.mutate({ userId, role });
    } else {
      addRoleMutation.mutate({ userId, role });
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (userId: string) => {
    const roles = getUserRoles(userId);
    if (roles.includes('admin')) {
      return <Badge className="bg-red-500 hover:bg-red-600">🔴 Admin</Badge>;
    }
    if (roles.includes('moderator')) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Moderator</Badge>;
    }
    return <Badge variant="secondary">⚪ User</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent p-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Users className="h-8 w-8 text-primary-foreground" />
            <h1 className="text-2xl font-bold text-primary-foreground">User Management</h1>
          </div>
          <p className="text-primary-foreground/80 mt-2">Manage user roles and permissions</p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              All Users ({filteredProfiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{profile.username}</p>
                        <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                        {profile.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{profile.full_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getRoleBadge(profile.id)}
                      
                      <Button
                        size="sm"
                        variant={hasRole(profile.id, 'admin') ? "destructive" : "default"}
                        onClick={() => toggleRole(profile.id, 'admin')}
                        disabled={addRoleMutation.isPending || removeRoleMutation.isPending}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {hasRole(profile.id, 'admin') ? 'Remove Admin' : 'Make Admin'}
                      </Button>

                      <Button
                        size="sm"
                        variant={hasRole(profile.id, 'moderator') ? "destructive" : "outline"}
                        onClick={() => toggleRole(profile.id, 'moderator')}
                        disabled={addRoleMutation.isPending || removeRoleMutation.isPending}
                      >
                        <ShieldAlert className="h-4 w-4 mr-1" />
                        {hasRole(profile.id, 'moderator') ? 'Remove Mod' : 'Make Mod'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
};

export default AdminUserManagement;
