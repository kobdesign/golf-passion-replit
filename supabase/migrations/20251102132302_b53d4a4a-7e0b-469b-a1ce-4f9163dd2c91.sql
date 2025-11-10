-- Create enum type for round visibility
CREATE TYPE round_visibility AS ENUM ('everyone', 'friends', 'private');

-- Add visibility column to rounds table
ALTER TABLE rounds 
ADD COLUMN visibility round_visibility DEFAULT 'everyone';

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own rounds" ON rounds;

-- Create new policy for visibility-based access
CREATE POLICY "Users can view rounds based on visibility"
ON rounds FOR SELECT
USING (
  user_id = auth.uid() OR -- Owner can always view
  visibility = 'everyone' OR -- Public rounds
  (
    visibility = 'friends' AND 
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE ((user_id = rounds.user_id AND friend_id = auth.uid() AND status = 'accepted')
         OR (friend_id = rounds.user_id AND user_id = auth.uid() AND status = 'accepted'))
    )
  )
);