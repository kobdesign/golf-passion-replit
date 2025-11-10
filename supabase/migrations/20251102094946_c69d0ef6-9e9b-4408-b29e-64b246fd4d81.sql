-- Add is_active column to courses table for soft delete functionality
ALTER TABLE courses 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN courses.is_active IS 'Indicates if the course is active and should be visible to users. Default is true.';