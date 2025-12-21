-- Add Stripe Connect columns to photographer_profiles table
ALTER TABLE photographer_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_photographer_stripe_account
ON photographer_profiles(stripe_account_id);

-- Add comment for documentation
COMMENT ON COLUMN photographer_profiles.stripe_account_id IS 'Stripe Connect Express account ID for receiving payments';
COMMENT ON COLUMN photographer_profiles.stripe_account_status IS 'Status: pending, active, restricted, or disabled';
COMMENT ON COLUMN photographer_profiles.stripe_onboarding_completed IS 'Whether photographer has completed Stripe onboarding';
COMMENT ON COLUMN photographer_profiles.stripe_charges_enabled IS 'Whether the account can receive charges';
