-- Migration: Add note and tags columns to photo_codes table
-- Created: 2025-12-06

-- Add note column (TEXT)
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add tags column (TEXT ARRAY)
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN public.photo_codes.note IS 'Optional note/memo for the photographer (e.g., "Sarah & Tom wedding")';
COMMENT ON COLUMN public.photo_codes.tags IS 'Optional tags for categorization (e.g., ["wedding", "outdoor", "portrait"])';
