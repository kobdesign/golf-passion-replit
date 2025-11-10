-- Add coordinate columns to holes table for mapping with Mapbox
ALTER TABLE public.holes
ADD COLUMN IF NOT EXISTS tee_latitude numeric,
ADD COLUMN IF NOT EXISTS tee_longitude numeric,
ADD COLUMN IF NOT EXISTS pin_latitude numeric,
ADD COLUMN IF NOT EXISTS pin_longitude numeric,
ADD COLUMN IF NOT EXISTS hole_coordinates jsonb; -- Store additional shape data for complex holes

-- Add metadata for course mapping
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS golf_course_api_id text UNIQUE,
ADD COLUMN IF NOT EXISTS course_data jsonb; -- Store full API response for reference

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_api_id ON public.courses(golf_course_api_id);
CREATE INDEX IF NOT EXISTS idx_holes_course_id ON public.holes(course_id);