-- Backfill profiles for users who signed up but don't have a profile record yet
-- This fixes the foreign key constraint errors on likes, posts, comments, etc.

-- Insert missing profiles for all auth.users that don't have a profile
INSERT INTO public.profiles (id, email, username, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'full_name', COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1))) as full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Log the backfill results
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NOT NULL;
  
  RAISE NOTICE 'Backfill complete. Total profiles: %', backfilled_count;
END $$;
