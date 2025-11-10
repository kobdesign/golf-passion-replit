import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Image as ImageIcon, Trophy, X, Loader2, Target, TrendingUp, Award, Camera, ImagePlus } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import ImageGridPreview from "@/components/ImageGridPreview";
import { useToast } from "@/hooks/use-toast";
import { calculateVsPar, getVsParValue } from "@/lib/courseUtils";
import { takePicture, pickFromGallery, dataUrlToFile } from "@/lib/camera";
import { Capacitor } from "@capacitor/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch recent completed rounds
  const { data: recentRounds = [] } = useQuery({
    queryKey: ['recent-rounds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('rounds')
        .select(`
          *,
          courses:course_id (
            name,
            total_par
          )
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('date_played', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedRound = recentRounds.find(r => r.id === selectedRoundId);

  // Fetch hole scores for selected round to display stats
  const { data: roundStats } = useQuery({
    queryKey: ['round-stats', selectedRoundId],
    queryFn: async () => {
      if (!selectedRoundId) return null;

      const { data: holeScores } = await supabase
        .from('hole_scores')
        .select('*, holes!inner(par)')
        .eq('round_id', selectedRoundId);

      if (!holeScores || holeScores.length === 0) return null;

      // Calculate totalPar from actual completed holes
      const totalPar = holeScores
        .filter(hs => hs.strokes != null)
        .reduce((sum, hs) => sum + (hs.holes?.par || 0), 0);

      const totalPutts = holeScores.reduce((sum, hs) => sum + (hs.putts || 0), 0);
      const fairwaysHit = holeScores.filter(hs => hs.fairway_hit).length;
      const fairwaysTotal = holeScores.filter(hs => (hs.holes?.par || 0) >= 4).length;
      const girsHit = holeScores.filter(hs => hs.green_in_regulation).length;
      const birdies = holeScores.filter(hs => hs.strokes === (hs.holes?.par || 0) - 1).length;
      const eagles = holeScores.filter(hs => hs.strokes <= (hs.holes?.par || 0) - 2).length;

      return { totalPar, totalPutts, fairwaysHit, fairwaysTotal, girsHit, total: holeScores.length, birdies, eagles };
    },
    enabled: !!selectedRoundId,
  });

  // Check if we're on a native platform
  const isNativePlatform = Capacitor.isNativePlatform();

  const validateAndAddImage = (file: File, preview: string) => {
    // Validate total images (max 10)
    if (selectedImages.length >= 10) {
      toast({
        title: "Too many images",
        description: "You can upload a maximum of 10 images per post",
        variant: "destructive",
      });
      return false;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image is larger than 10MB",
        variant: "destructive",
      });
      return false;
    }

    // Add to state
    setSelectedImages(prev => [...prev, file]);
    setImagePreviews(prev => [...prev, preview]);
    return true;
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePicture();
      if (!photo) return;

      const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format}`);
      validateAndAddImage(file, photo.dataUrl);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Failed to take photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePickFromGallery = async () => {
    if (isNativePlatform) {
      try {
        const photo = await pickFromGallery();
        if (!photo) return;

        const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format}`);
        validateAndAddImage(file, photo.dataUrl);
      } catch (error) {
        toast({
          title: "Gallery Error",
          description: "Failed to pick photo. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to file input on web
      document.getElementById("image-upload")?.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate and add each file
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        validateAndAddImage(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!postContent.trim() && selectedImages.length === 0 && !selectedRoundId) {
        throw new Error('Post content required');
      }

      setIsUploading(true);
      const imageUrls: Array<{ url: string }> = [];

      // Upload images if selected
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          return { url: publicUrl };
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls.push(...uploadedUrls);
      }

      // Insert post
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postContent.trim() || null,
          image_url: imageUrls.length > 0 ? imageUrls[0].url : null, // backward compatibility
          image_urls: imageUrls,
          round_id: selectedRoundId || null,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast({
        title: "Post created!",
        description: "Your post has been shared with your followers",
      });
      navigate("/social-feed");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handlePost = () => {
    if (!postContent.trim() && selectedImages.length === 0 && !selectedRoundId) {
      toast({
        title: "Empty Post",
        description: "Please add some content to your post",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate();
  };

  const handleCancel = () => {
    navigate("/social-feed");
  };

  const canPost = (postContent.trim() || selectedImages.length > 0 || selectedRoundId) && !isUploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-muted/20 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full"
              disabled={isUploading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Create Post</h1>
            <Button
              onClick={handlePost}
              disabled={!canPost}
              className="rounded-full px-6"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Card className="p-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback>
                {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{profile?.full_name || profile?.username}</div>
              <div className="text-sm text-muted-foreground">Public</div>
            </div>
          </div>

          {/* Text Input */}
          <Textarea
            placeholder="What's on your mind?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-base p-0"
            disabled={isUploading}
          />

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <ImageGridPreview 
              images={imagePreviews} 
              onRemove={handleRemoveImage}
              disabled={isUploading}
            />
          )}

          {/* Recent Rounds Selection */}
          {recentRounds.length > 0 && !selectedRound && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Recent Round</label>
              <Select value={selectedRoundId} onValueChange={setSelectedRoundId} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a round to attach" />
                </SelectTrigger>
                <SelectContent>
                  {recentRounds.map((round: any) => (
                    <SelectItem key={round.id} value={round.id}>
                      {round.courses.name} - {round.total_score} ({round.date_played})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Attached Round Summary */}
          {selectedRound && (
            <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-4 space-y-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full h-6 w-6"
                onClick={() => setSelectedRoundId("")}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>

              <div className="flex items-start gap-2">
                <Trophy className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1">
                  <div className="font-semibold">{selectedRound.courses.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedRound.date_played}</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 py-2">
                <div className="text-center">
                  <div className="text-3xl font-bold">{selectedRound.total_score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <Badge
                  variant={
                    getVsParValue(
                      selectedRound.total_score, 
                      roundStats?.totalPar ?? selectedRound.courses.total_par
                    ) <= 0 
                      ? "default" 
                      : "destructive"
                  }
                  className="text-lg px-3 py-1"
                >
                  {calculateVsPar(
                    selectedRound.total_score, 
                    roundStats?.totalPar ?? selectedRound.courses.total_par
                  )}
                </Badge>
              </div>

              {/* Stats Grid */}
              {roundStats && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-semibold">{roundStats.totalPutts}</div>
                    <div className="text-xs text-muted-foreground">Putts</div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-semibold">
                      {roundStats.fairwaysTotal > 0 ? `${roundStats.fairwaysHit}/${roundStats.fairwaysTotal}` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Fairways</div>
                  </div>
                  <div className="text-center">
                    <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-semibold">
                      {roundStats.total > 0 ? `${roundStats.girsHit}/${roundStats.total}` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">GIR</div>
                  </div>
                  {(roundStats.birdies > 0 || roundStats.eagles > 0) && (
                    <div className="col-span-3 text-center pt-2 border-t">
                      <Award className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-semibold">
                        {roundStats.eagles > 0 && `${roundStats.eagles} Eagle${roundStats.eagles > 1 ? 's' : ''}`}
                        {roundStats.eagles > 0 && roundStats.birdies > 0 && ' + '}
                        {roundStats.birdies > 0 && `${roundStats.birdies} Birdie${roundStats.birdies !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4 border-t">
            {/* Hidden file input for web fallback */}
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading || selectedImages.length >= 10}
            />

            {/* Photo buttons with native camera support */}
            {isNativePlatform ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={isUploading || selectedImages.length >= 10}
                  >
                    <ImageIcon className="h-5 w-5" />
                    {selectedImages.length > 0 ? `Photo (${selectedImages.length}/10)` : 'Photo'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleTakePhoto} disabled={isUploading || selectedImages.length >= 10}>
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePickFromGallery} disabled={isUploading || selectedImages.length >= 10}>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Choose from Gallery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePickFromGallery}
                className="gap-2"
                disabled={isUploading || selectedImages.length >= 10}
              >
                <ImageIcon className="h-5 w-5" />
                {selectedImages.length > 0 ? `Photo (${selectedImages.length}/10)` : 'Photo'}
              </Button>
            )}

            {recentRounds.length > 0 && (
              <Button
                variant={selectedRoundId ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedRoundId(selectedRoundId ? "" : recentRounds[0]?.id || "")}
                className="gap-2"
                disabled={isUploading}
              >
                <Trophy className="h-5 w-5" />
                {selectedRoundId ? "Round Attached" : "Recent Round"}
              </Button>
            )}
          </div>
        </Card>

        {/* Cancel Button */}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={handleCancel} className="px-8" disabled={isUploading}>
            Cancel
          </Button>
        </div>
      </div>

      <MobileNav />
    </div>
  );
};

export default CreatePost;
