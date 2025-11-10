import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, UserPlus, UserMinus, Check, X, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          user:profiles!friendships_user_id_fkey(id, full_name, username, avatar_url, handicap),
          friend:profiles!friendships_friend_id_fkey(id, full_name, username, avatar_url, handicap)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');
      
      if (error) throw error;
      
      return data.map(friendship => ({
        friendshipId: friendship.id,
        profile: friendship.user_id === user.id ? friendship.friend : friendship.user,
      }));
    },
    enabled: !!user,
  });

  // Fetch pending requests
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          created_at,
          user:profiles!friendships_user_id_fkey(id, full_name, username, avatar_url, handicap)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      return data.map(friendship => ({
        friendshipId: friendship.id,
        profile: friendship.user,
      }));
    },
    enabled: !!user,
  });

  // Search users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, handicap')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && searchQuery.length >= 2,
  });

  // Accept friend request
  const acceptRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] });
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends!",
      });
    },
  });

  // Reject friend request
  const rejectRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', user?.id] });
      toast({
        title: "Request Rejected",
        description: "Friend request rejected.",
      });
    },
  });

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user?.id,
          friend_id: friendId,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "Friend request sent successfully!",
      });
      setSearchQuery("");
    },
  });

  // Remove friend
  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      toast({
        title: "Friend Removed",
        description: "Friend removed from your list.",
      });
    },
  });

  const FriendCard = ({ profile, friendshipId, isPending = false }: any) => {
    const displayName = profile?.full_name || profile?.username || 'Unknown';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">@{profile?.username || 'user'}</p>
              <Badge variant="secondary" className="mt-1">
                HCP {profile?.handicap || 0}
              </Badge>
            </div>

            {isPending ? (
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="default"
                  onClick={() => acceptRequestMutation.mutate(friendshipId)}
                  disabled={acceptRequestMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => rejectRequestMutation.mutate(friendshipId)}
                  disabled={rejectRequestMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeFriendMutation.mutate(friendshipId)}
                disabled={removeFriendMutation.isPending}
              >
                <UserMinus className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-accent p-6">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="rounded-full text-primary-foreground hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary-foreground">Friends</h1>
              <p className="text-sm text-primary-foreground/80">{friends.length} friends</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="mt-4 space-y-2">
                {searchLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No users found</p>
                ) : (
                  searchResults.map((result: any) => {
                    const displayName = result.full_name || result.username || 'Unknown';
                    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    
                    return (
                      <div key={result.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/10">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={result.avatar_url || undefined} alt={displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <p className="font-semibold">{displayName}</p>
                          <p className="text-sm text-muted-foreground">@{result.username || 'user'}</p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => sendRequestMutation.mutate(result.id)}
                          disabled={sendRequestMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4 mt-6">
            {friendsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No friends yet. Start searching!</p>
                </CardContent>
              </Card>
            ) : (
              friends.map((friend: any) => (
                <FriendCard
                  key={friend.friendshipId}
                  profile={friend.profile}
                  friendshipId={friend.friendshipId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-6">
            {pendingLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request: any) => (
                <FriendCard
                  key={request.friendshipId}
                  profile={request.profile}
                  friendshipId={request.friendshipId}
                  isPending={true}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;