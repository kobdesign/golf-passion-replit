-- Add configuration_id to rounds table
ALTER TABLE public.rounds 
ADD COLUMN configuration_id UUID REFERENCES public.course_configurations(id);

-- Add index for better query performance
CREATE INDEX idx_rounds_configuration_id ON public.rounds(configuration_id);

-- Add comment for documentation
COMMENT ON COLUMN public.rounds.configuration_id IS 'References the course configuration used for this round (e.g., Front 9, Back 9, Full 18)';