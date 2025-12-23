-- Migration: Add dynamic pricing to photo codes
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Add price column to photo_codes table
-- =====================================================
ALTER TABLE public.photo_codes
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 3.00 CHECK (price >= 3.00);

-- Add comment for documentation
COMMENT ON COLUMN public.photo_codes.price IS 'Price in USD for this photo code (minimum $3.00)';

-- =====================================================
-- 2. Update transactions table to store photographer share percentage
-- =====================================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS photographer_share_percentage DECIMAL(5,2) DEFAULT 66.67 CHECK (photographer_share_percentage >= 0 AND photographer_share_percentage <= 100);

COMMENT ON COLUMN public.transactions.photographer_share_percentage IS 'Percentage of sale that goes to photographer (default 66.67%)';

-- =====================================================
-- 3. Update existing codes to have default price
-- =====================================================
UPDATE public.photo_codes
SET price = 3.00
WHERE price IS NULL;
