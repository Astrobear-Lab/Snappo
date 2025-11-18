-- Add INSERT policy for profiles table
-- This allows users to insert their own profile

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
