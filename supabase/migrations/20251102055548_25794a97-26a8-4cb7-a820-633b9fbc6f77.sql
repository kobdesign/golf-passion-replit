-- Create sub_courses table for course subdivisions (Front 9, Back 9, A/B/C courses)
CREATE TABLE public.sub_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sequence INTEGER NOT NULL,
    start_hole INTEGER NOT NULL,
    end_hole INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(course_id, sequence)
);

-- Create tee_type enum for different tee colors
CREATE TYPE public.tee_type AS ENUM ('black', 'blue', 'white', 'yellow', 'red');

-- Create tee_positions table for multiple tees per hole
CREATE TABLE public.tee_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hole_id UUID REFERENCES public.holes(id) ON DELETE CASCADE NOT NULL,
    tee_type tee_type NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    distance_to_pin INTEGER NOT NULL,
    elevation INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(hole_id, tee_type)
);

-- Enable RLS
ALTER TABLE public.sub_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tee_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sub_courses
CREATE POLICY "Sub-courses are viewable by everyone"
ON public.sub_courses
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert sub-courses"
ON public.sub_courses
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sub-courses"
ON public.sub_courses
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sub-courses"
ON public.sub_courses
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tee_positions
CREATE POLICY "Tee positions are viewable by everyone"
ON public.tee_positions
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert tee positions"
ON public.tee_positions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tee positions"
ON public.tee_positions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tee positions"
ON public.tee_positions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_sub_courses_updated_at
BEFORE UPDATE ON public.sub_courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tee_positions_updated_at
BEFORE UPDATE ON public.tee_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();