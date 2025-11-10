-- Create course_configurations table to store different play configurations
CREATE TABLE public.course_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  total_holes INTEGER NOT NULL DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for mapping sub-courses to configurations
CREATE TABLE public.configuration_sub_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuration_id UUID NOT NULL REFERENCES public.course_configurations(id) ON DELETE CASCADE,
  sub_course_id UUID NOT NULL REFERENCES public.sub_courses(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(configuration_id, sub_course_id),
  UNIQUE(configuration_id, sequence)
);

-- Enable Row Level Security
ALTER TABLE public.course_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_sub_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_configurations
CREATE POLICY "Course configurations are viewable by everyone"
  ON public.course_configurations
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert course configurations"
  ON public.course_configurations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update course configurations"
  ON public.course_configurations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete course configurations"
  ON public.course_configurations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for configuration_sub_courses
CREATE POLICY "Configuration sub-courses are viewable by everyone"
  ON public.configuration_sub_courses
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert configuration sub-courses"
  ON public.configuration_sub_courses
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update configuration sub-courses"
  ON public.configuration_sub_courses
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete configuration sub-courses"
  ON public.configuration_sub_courses
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates on course_configurations
CREATE TRIGGER update_course_configurations_updated_at
  BEFORE UPDATE ON public.course_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_course_configurations_course_id ON public.course_configurations(course_id);
CREATE INDEX idx_configuration_sub_courses_configuration_id ON public.configuration_sub_courses(configuration_id);
CREATE INDEX idx_configuration_sub_courses_sub_course_id ON public.configuration_sub_courses(sub_course_id);