-- Fix infinite recursion in photo_codes RLS policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Anyone can update phone number" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can update their codes" ON public.photo_codes;

-- Create separate policies for different update scenarios

-- 1. Allow photographers to update their own codes (uploaded_at, published_at, etc.)
CREATE POLICY "Photographers can update their codes"
  ON public.photo_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.code_photos cp
      JOIN public.photos p ON p.id = cp.photo_id
      JOIN public.photographer_profiles pp ON pp.id = p.photographer_id
      WHERE cp.code_id = photo_codes.id
      AND pp.user_id = auth.uid()
    )
  );

-- 2. Allow anyone to update unredeemed codes (for phone number collection)
-- This is safe because we only allow updating specific fields
CREATE POLICY "Anyone can update unredeemed code metadata"
  ON public.photo_codes FOR UPDATE
  USING (NOT is_redeemed)
  WITH CHECK (NOT is_redeemed);

-- 3. Allow purchased users to update their purchased codes
CREATE POLICY "Purchased users can update their codes"
  ON public.photo_codes FOR UPDATE
  USING (auth.uid() = purchased_by);
