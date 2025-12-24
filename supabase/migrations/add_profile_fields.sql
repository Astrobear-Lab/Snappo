-- Add bio and phone columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment to describe the columns
COMMENT ON COLUMN public.profiles.bio IS 'User biography or description';
COMMENT ON COLUMN public.profiles.phone IS 'User phone number';
