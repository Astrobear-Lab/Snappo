-- Add admin role to profiles table
-- This allows certain users to use test payment instead of live payment

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;

  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To set a user as admin, run this query (replace with actual user ID):
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';
