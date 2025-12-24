-- Migration: Add photographer_id to photo_codes table
-- This fixes the security issue where all users could see all codes

-- 1. Add photographer_id column to photo_codes
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS photographer_id UUID REFERENCES public.photographer_profiles(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_photo_codes_photographer_id ON public.photo_codes(photographer_id);

-- 3. Update RLS policies to use photographer_id
DROP POLICY IF EXISTS "Photographers can create codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can view own codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can update own codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can delete own codes" ON public.photo_codes;

-- Policy: Photographers can create their own codes
CREATE POLICY "Photographers can create codes"
  ON public.photo_codes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photo_codes.photographer_id
      AND user_id = auth.uid()
      AND status IN ('pending', 'active')
    )
  );

-- Policy: Photographers can view their own codes
CREATE POLICY "Photographers can view own codes"
  ON public.photo_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photo_codes.photographer_id
      AND user_id = auth.uid()
    )
  );

-- Policy: Photographers can update their own codes
CREATE POLICY "Photographers can update own codes"
  ON public.photo_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photo_codes.photographer_id
      AND user_id = auth.uid()
    )
  );

-- Policy: Photographers can delete their own codes
CREATE POLICY "Photographers can delete own codes"
  ON public.photo_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photo_codes.photographer_id
      AND user_id = auth.uid()
    )
  );

-- Keep existing policies for public access (viewing unredeemed codes, etc.)
-- These remain unchanged and will work alongside the new photographer-specific policies

-- 4. Migrate existing data: Set photographer_id for existing codes based on linked photos
-- This updates codes that already have photos linked to them
UPDATE public.photo_codes pc
SET photographer_id = p.photographer_id
FROM (
  SELECT DISTINCT ON (cp.code_id)
    cp.code_id,
    ph.photographer_id
  FROM public.code_photos cp
  JOIN public.photos ph ON cp.photo_id = ph.id
  WHERE ph.photographer_id IS NOT NULL
) AS p
WHERE pc.id = p.code_id
AND pc.photographer_id IS NULL;

-- NOTE: Codes without photos will have NULL photographer_id
-- These should be manually assigned or deleted if they're orphaned
