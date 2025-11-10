-- Add current_hole column to rounds table to track the current hole being played
ALTER TABLE public.rounds
ADD COLUMN current_hole integer DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN public.rounds.current_hole IS 'The current hole number the player is on (1-18). Updated as player navigates between holes.';