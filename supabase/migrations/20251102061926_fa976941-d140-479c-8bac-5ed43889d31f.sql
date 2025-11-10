-- Add available tee types to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS available_tee_types tee_type[] DEFAULT ARRAY['black', 'blue', 'white', 'yellow', 'red']::tee_type[];

-- Add sub_course_id to holes table
ALTER TABLE public.holes 
ADD COLUMN IF NOT EXISTS sub_course_id uuid REFERENCES public.sub_courses(id) ON DELETE SET NULL;

-- Add multiple pin positions for green (front, middle, back)
ALTER TABLE public.holes
ADD COLUMN IF NOT EXISTS pin_front_latitude numeric,
ADD COLUMN IF NOT EXISTS pin_front_longitude numeric,
ADD COLUMN IF NOT EXISTS pin_back_latitude numeric,
ADD COLUMN IF NOT EXISTS pin_back_longitude numeric;

-- Rename existing pin columns to indicate middle position
COMMENT ON COLUMN public.holes.pin_latitude IS 'Middle pin position latitude';
COMMENT ON COLUMN public.holes.pin_longitude IS 'Middle pin position longitude';