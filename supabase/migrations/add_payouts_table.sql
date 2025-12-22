-- Migration: Add payouts table for tracking Stripe transfers and payouts
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Create Payouts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_id UUID REFERENCES public.photographer_profiles(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_transfer_id TEXT UNIQUE,        -- tr_xxx (platform to connected account)
  stripe_payout_id TEXT UNIQUE,          -- po_xxx (connected account to bank)
  stripe_payment_intent_id TEXT,         -- pi_xxx (original payment)

  -- Related transaction
  transaction_id UUID REFERENCES public.transactions(id),
  photo_code_id UUID REFERENCES public.photo_codes(id),

  -- Financial details
  amount DECIMAL(10,2) NOT NULL,         -- Amount transferred/paid out
  currency TEXT DEFAULT 'usd',

  -- Status tracking
  type TEXT NOT NULL CHECK (type IN ('transfer', 'payout')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),

  -- Failure info
  failure_code TEXT,
  failure_message TEXT,

  -- Timestamps
  stripe_created_at TIMESTAMP WITH TIME ZONE,
  arrival_date DATE,                      -- Expected arrival for payouts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Enable RLS
-- =====================================================
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLS Policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Photographers can view own payouts" ON public.payouts;

-- Photographers can only view their own payouts
CREATE POLICY "Photographers can view own payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.photographer_profiles
      WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payouts_photographer_id ON public.payouts(photographer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_transfer_id ON public.payouts(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_payout_id ON public.payouts(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_type_status ON public.payouts(type, status);

-- =====================================================
-- 5. Add trigger for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_payouts_updated_at ON public.payouts;

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Add stripe_account_status check constraint update
-- =====================================================
-- Update the check constraint to include 'pending_verification' status
ALTER TABLE public.photographer_profiles
  DROP CONSTRAINT IF EXISTS photographer_profiles_stripe_account_status_check;

ALTER TABLE public.photographer_profiles
  ADD CONSTRAINT photographer_profiles_stripe_account_status_check
  CHECK (stripe_account_status IN ('pending', 'pending_verification', 'active', 'restricted', 'disabled'));
