-- Phase 3: Add support for multiple images per post
-- Add new column for multiple images
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single image_url to image_urls array
UPDATE public.posts
SET image_urls = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' 
  THEN jsonb_build_array(jsonb_build_object('url', image_url))
  ELSE '[]'::jsonb
END
WHERE image_urls = '[]'::jsonb OR image_urls IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.image_urls IS 'Array of image objects with url and optional metadata: [{"url": "https://...", "width": 1920, "height": 1080}]';

-- Keep the old image_url column for backward compatibility (can be removed later if needed)
-- ALTER TABLE public.posts DROP COLUMN image_url;