-- ============================================================================
-- Complete fix for profile creation and backfill issues
-- This migration:
-- 1. Fixes the handle_new_user() trigger function to properly create profiles
-- 2. Backfills missing profiles for existing users
-- 3. Ensures RLS policies are correct
-- ============================================================================

-- Step 1: Fix the handle_new_user() trigger function
-- This function runs automatically when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Backfill profiles for existing users who don't have one
-- This fixes the foreign key constraint errors
-- Wrapped in exception handling to prevent transaction-wide failures
DO $$
DECLARE
  user_record RECORD;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
      COALESCE(au.raw_user_meta_data->>'full_name', COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1))) as full_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, email, username, full_name)
      VALUES (user_record.id, user_record.email, user_record.username, user_record.full_name)
      ON CONFLICT (id) DO NOTHING;
      inserted_count := inserted_count + 1;
    EXCEPTION
      WHEN others THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to insert profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill: % profiles inserted, % errors', inserted_count, error_count;
END $$;

-- Step 3: Verify RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Ensure necessary RLS policies exist
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate policies with correct permissions
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles
FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Restore admin policy
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Log the results
DO $$
DECLARE
  total_users INTEGER;
  total_profiles INTEGER;
  missing_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  missing_profiles := total_users - total_profiles;
  
  RAISE NOTICE '=== Profile Fix Complete ===';
  RAISE NOTICE 'Total auth users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Missing profiles (should be 0): %', missing_profiles;
END $$;
