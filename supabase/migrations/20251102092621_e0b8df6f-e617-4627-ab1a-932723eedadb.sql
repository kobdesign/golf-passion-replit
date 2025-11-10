-- Add foreign key constraint with cascade delete from holes to sub_courses
ALTER TABLE public.holes
DROP CONSTRAINT IF EXISTS holes_sub_course_id_fkey;

ALTER TABLE public.holes
ADD CONSTRAINT holes_sub_course_id_fkey 
FOREIGN KEY (sub_course_id) 
REFERENCES public.sub_courses(id) 
ON DELETE CASCADE;