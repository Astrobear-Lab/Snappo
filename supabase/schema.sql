-- Snappo Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. User Profiles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. Photographer Profiles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.photographer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  bio TEXT,
  location TEXT,
  portfolio_url TEXT,

  -- Verification fields
  verified BOOLEAN DEFAULT FALSE,
  verification_photos_count INTEGER DEFAULT 0,
  auto_verified_at TIMESTAMP WITH TIME ZONE,

  -- Stats
  total_photos_uploaded INTEGER DEFAULT 0,
  total_photos_sold INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,

  -- Limits
  daily_upload_limit INTEGER DEFAULT 10,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.photographer_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Photographer profiles are viewable by everyone" ON public.photographer_profiles;
DROP POLICY IF EXISTS "Users can insert own photographer profile" ON public.photographer_profiles;
DROP POLICY IF EXISTS "Users can update own photographer profile" ON public.photographer_profiles;

-- Policies
CREATE POLICY "Photographer profiles are viewable by everyone"
  ON public.photographer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own photographer profile"
  ON public.photographer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photographer profile"
  ON public.photographer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Photos Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID REFERENCES public.photographer_profiles(id) ON DELETE CASCADE,

  -- File info
  file_url TEXT NOT NULL,
  watermarked_url TEXT NOT NULL, -- Now stores blurred version
  thumbnail_url TEXT,
  file_size INTEGER,
  is_sample BOOLEAN DEFAULT FALSE, -- If true, shows original even before payment
  exif_metadata JSONB,

  -- Photo metadata
  title TEXT,
  description TEXT,
  location TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold')),
  moderation_notes TEXT,

  -- Stats
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON public.photos;
DROP POLICY IF EXISTS "Photographers can insert own photos" ON public.photos;
DROP POLICY IF EXISTS "Photographers can view own photos" ON public.photos;

-- Policies
CREATE POLICY "Photos are viewable by everyone"
  ON public.photos FOR SELECT
  USING (status = 'approved' OR status = 'sold');

CREATE POLICY "Photographers can insert own photos"
  ON public.photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Photographers can view own photos"
  ON public.photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. Photo Codes Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.photo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,

  -- Metadata
  note TEXT,
  tags TEXT[],

  -- Redemption
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_by UUID REFERENCES public.profiles(id),
  redeemed_at TIMESTAMP WITH TIME ZONE,

  -- Purchase
  is_purchased BOOLEAN DEFAULT FALSE,
  purchased_by UUID REFERENCES public.profiles(id),
  purchased_at TIMESTAMP WITH TIME ZONE,

  -- Timeline timestamps
  shared_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4.1. Code Photos Table (Many-to-Many relationship)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.code_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id UUID REFERENCES public.photo_codes(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(code_id, photo_id) -- 하나의 코드에 같은 사진 중복 방지
);

-- Enable RLS
ALTER TABLE public.photo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view unredeemed codes" ON public.photo_codes;
DROP POLICY IF EXISTS "Code owner can view redeemed code" ON public.photo_codes;
DROP POLICY IF EXISTS "Photographers can create codes" ON public.photo_codes;

-- Policies for photo_codes
CREATE POLICY "Anyone can view unredeemed codes"
  ON public.photo_codes FOR SELECT
  USING (NOT is_redeemed);

CREATE POLICY "Code owner can view redeemed code"
  ON public.photo_codes FOR SELECT
  USING (auth.uid() = redeemed_by OR auth.uid() = purchased_by);

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

-- Drop existing policies for code_photos
DROP POLICY IF EXISTS "Anyone can view photos from unredeemed codes" ON public.code_photos;
DROP POLICY IF EXISTS "Code owner can view photos from redeemed codes" ON public.code_photos;
DROP POLICY IF EXISTS "Photographers can manage their code photos" ON public.code_photos;

-- Policies for code_photos
CREATE POLICY "Anyone can view photos from unredeemed codes"
  ON public.code_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_codes pc
      WHERE pc.id = code_photos.code_id
      AND NOT pc.is_redeemed
    )
  );

CREATE POLICY "Code owner can view photos from redeemed codes"
  ON public.code_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_codes pc
      WHERE pc.id = code_photos.code_id
      AND (pc.redeemed_by = auth.uid() OR pc.purchased_by = auth.uid())
    )
  );

CREATE POLICY "Photographers can manage their code photos"
  ON public.code_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.photo_codes pc
      JOIN public.photos p ON pc.id = code_photos.code_id
      JOIN public.photographer_profiles pp ON p.photographer_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. Transactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_code_id UUID REFERENCES public.photo_codes(id),
  buyer_id UUID REFERENCES public.profiles(id),
  photographer_id UUID REFERENCES public.photographer_profiles(id),

  amount DECIMAL(10,2) NOT NULL,
  photographer_earnings DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,

  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

  stripe_payment_id TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

-- Policies
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_photographer_profiles_updated_at ON public.photographer_profiles;
DROP TRIGGER IF EXISTS update_photos_updated_at ON public.photos;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photographer_profiles_updated_at BEFORE UPDATE ON public.photographer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique 6-digit code
CREATE OR REPLACE FUNCTION generate_photo_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.photo_codes WHERE code = result) INTO code_exists;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-verify photographer after 3 approved photos
CREATE OR REPLACE FUNCTION check_photographer_auto_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE public.photographer_profiles pp
    SET
      verification_photos_count = verification_photos_count + 1,
      verified = CASE
        WHEN verification_photos_count + 1 >= 3 THEN TRUE
        ELSE verified
      END,
      auto_verified_at = CASE
        WHEN verification_photos_count + 1 >= 3 AND auto_verified_at IS NULL
        THEN NOW()
        ELSE auto_verified_at
      END,
      status = CASE
        WHEN verification_photos_count + 1 >= 3 THEN 'active'::TEXT
        ELSE status
      END,
      daily_upload_limit = CASE
        WHEN verification_photos_count + 1 >= 3 THEN 100
        ELSE daily_upload_limit
      END
    WHERE pp.id = NEW.photographer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS photo_auto_verification ON public.photos;

-- Trigger for auto-verification
CREATE TRIGGER photo_auto_verification AFTER UPDATE ON public.photos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION check_photographer_auto_verification();

-- Function to increment photographer earnings and stats
CREATE OR REPLACE FUNCTION increment_photographer_earnings(
  p_photographer_id UUID,
  p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.photographer_profiles
  SET
    total_photos_sold = total_photos_sold + 1,
    total_earnings = total_earnings + p_amount
  WHERE id = p_photographer_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Indexes for Performance
-- =====================================================
DROP INDEX IF EXISTS idx_photos_photographer_id;
DROP INDEX IF EXISTS idx_photos_status;
DROP INDEX IF EXISTS idx_photo_codes_code;
DROP INDEX IF EXISTS idx_photo_codes_photo_id;
DROP INDEX IF EXISTS idx_photographer_profiles_user_id;
DROP INDEX IF EXISTS idx_photographer_profiles_status;

CREATE INDEX IF NOT EXISTS idx_photos_photographer_id ON public.photos(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON public.photos(status);
CREATE INDEX IF NOT EXISTS idx_photo_codes_code ON public.photo_codes(code);
CREATE INDEX IF NOT EXISTS idx_code_photos_code_id ON public.code_photos(code_id);
CREATE INDEX IF NOT EXISTS idx_code_photos_photo_id ON public.code_photos(photo_id);
CREATE INDEX IF NOT EXISTS idx_photographer_profiles_user_id ON public.photographer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_photographer_profiles_status ON public.photographer_profiles(status);

-- =====================================================
-- Initial Data / Seed (Optional)
-- =====================================================

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Storage Buckets Configuration
-- =====================================================

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('photos', 'photos', true),
  ('photos-original', 'photos-original', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies (Must be created via Dashboard or separate migration)
-- =====================================================
-- NOTE: Storage policies cannot be created via SQL Editor due to permission restrictions.
-- Please create these policies manually in Supabase Dashboard → Storage → [bucket] → Policies
--
-- For 'photos' bucket:
--
-- 1. SELECT (Anyone can view):
--    bucket_id = 'photos'
--
-- 2. INSERT (Users upload to own folder):
--    bucket_id = 'photos'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- 3. UPDATE (Users update own files):
--    bucket_id = 'photos'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- 4. DELETE (Users delete own files):
--    bucket_id = 'photos'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- For 'photos-original' bucket:
--
-- 1. SELECT (Users view own files):
--    bucket_id = 'photos-original'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- 2. INSERT (Users upload to own folder):
--    bucket_id = 'photos-original'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- 3. UPDATE (Users update own files):
--    bucket_id = 'photos-original'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
--
-- 4. DELETE (Users delete own files):
--    bucket_id = 'photos-original'
--    AND auth.role() = 'authenticated'
--    AND (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
