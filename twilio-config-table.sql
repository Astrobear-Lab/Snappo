-- Twilio configuration table for dynamic phone number management

CREATE TABLE IF NOT EXISTS public.sms_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'twilio', -- 'twilio', 'aws-sns', etc
  phone_number TEXT NOT NULL, -- E.164 format: +12345678901
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Only one active config at a time
  CONSTRAINT one_active_config UNIQUE (is_active) WHERE is_active = TRUE
);

-- Initial Twilio phone number (update this with your actual number)
INSERT INTO public.sms_config (phone_number, is_active)
VALUES ('+12345678901', TRUE)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active config
CREATE POLICY "Anyone can read active sms config"
  ON public.sms_config FOR SELECT
  USING (is_active = TRUE);

-- Policy: Only authenticated users can update (photographers/admins)
CREATE POLICY "Authenticated users can update sms config"
  ON public.sms_config FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
