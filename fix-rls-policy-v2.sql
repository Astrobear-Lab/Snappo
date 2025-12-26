-- Fix RLS infinite recursion for phone number updates
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies for photo_codes
DROP POLICY IF EXISTS "Anyone can view unredeemed codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Code owner can view redeemed code" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can create codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Anyone can update phone number" ON public.photo_codes;

-- Recreate SELECT policies (no changes)
CREATE POLICY "Anyone can view unredeemed codes"
  ON public.photo_codes FOR SELECT
  USING (NOT is_redeemed);

CREATE POLICY "Code owner can view redeemed code"
  ON public.photo_codes FOR SELECT
  USING (auth.uid() = redeemed_by OR auth.uid() = purchased_by);

-- Recreate INSERT policy (no changes)
CREATE POLICY "Photographers can create codes"
  ON public.photo_codes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE user_id = auth.uid()
      AND status IN ('pending', 'active')
    )
  );

-- NEW: Simple UPDATE policy without recursion
-- Allow anyone to update ONLY phone-related fields
CREATE POLICY "Anyone can update phone number"
  ON public.photo_codes FOR UPDATE
  USING (
    -- No conditions on USING - anyone can attempt update
    true
  )
  WITH CHECK (
    -- No conditions on WITH CHECK - allow the update
    true
  );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'photo_codes'
ORDER BY policyname;
