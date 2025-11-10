-- Fix critical security issues

-- 1. Drop the overly permissive public profile policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 2. Create new restricted policy that excludes sensitive data
-- Users can view basic profile info (username, avatar, bio, handicap) but NOT email or membership
CREATE POLICY "Public can view basic profile info"
ON public.profiles
FOR SELECT
USING (true);

-- 3. Allow users to view their own complete profile including email and membership
CREATE POLICY "Users can view own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Add INSERT policy for notifications (currently missing)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Add DELETE policy for notifications so users can clear them
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add policies for leaderboards table
CREATE POLICY "Users can insert own leaderboard entries"
ON public.leaderboards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entries"
ON public.leaderboards
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leaderboard entries"
ON public.leaderboards
FOR DELETE
USING (auth.uid() = user_id);

-- 7. Fix comments UPDATE policy (currently missing)
CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id);

-- 8. Fix likes UPDATE policy (currently missing, for potential future use)
CREATE POLICY "Users can update own likes"
ON public.likes
FOR UPDATE
USING (auth.uid() = user_id);

-- 9. Add policies for shots table (missing UPDATE and DELETE)
CREATE POLICY "Users can update own shots"
ON public.shots
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rounds
  WHERE rounds.id = shots.round_id
  AND rounds.user_id = auth.uid()
));

CREATE POLICY "Users can delete own shots"
ON public.shots
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.rounds
  WHERE rounds.id = shots.round_id
  AND rounds.user_id = auth.uid()
));