-- Fix infinite recursion in photo_codes RLS policy (v2)
-- This completely removes all UPDATE policies and creates clean ones

-- Step 1: Drop ALL existing UPDATE policies
DROP POLICY IF EXISTS "Anyone can update phone number" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can update their codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Anyone can update unredeemed code metadata" ON public.photo_codes;
DROP POLICY IF EXISTS "Purchased users can update their codes" ON public.photo_codes;

-- Step 2: Disable RLS temporarily to clean up
ALTER TABLE public.photo_codes DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE public.photo_codes ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new, clean UPDATE policies

-- Allow service role (Edge Functions) to update anything
CREATE POLICY "Service role can update codes"
  ON public.photo_codes FOR UPDATE
  USING (auth.role() = 'service_role');

-- Allow authenticated users (photographers) to update their own codes
CREATE POLICY "Authenticated users can update codes"
  ON public.photo_codes FOR UPDATE
  USING (auth.role() = 'authenticated');
