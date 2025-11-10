-- Add detailed hole information fields for admin management
ALTER TABLE holes
ADD COLUMN IF NOT EXISTS hazards jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS green_front_distance integer,
ADD COLUMN IF NOT EXISTS green_middle_distance integer,
ADD COLUMN IF NOT EXISTS green_back_distance integer,
ADD COLUMN IF NOT EXISTS notes text;

-- Add comment to explain hazards structure
COMMENT ON COLUMN holes.hazards IS 'Array of hazard objects with type (water, bunker, tree, etc.) and coordinates';

-- Add google_place_id to courses table for tracking Google Places data
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS google_place_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_google_place_id ON courses(google_place_id);

-- Add admin role to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Create RLS policy for admin access
CREATE POLICY "Admins can update courses" 
ON courses 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update holes" 
ON holes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert holes" 
ON holes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);