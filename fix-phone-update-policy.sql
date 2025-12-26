-- Fix RLS policy for phone number updates
-- Run this in Supabase SQL Editor

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Anyone can update phone number" ON public.photo_codes;

-- Create new UPDATE policy that allows anyone to update phone number
CREATE POLICY "Anyone can update phone number"
  ON public.photo_codes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'photo_codes';
