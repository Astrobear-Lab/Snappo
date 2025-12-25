-- Add buyer_message column to transactions table
-- This allows buyers to leave optional messages for photographers

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS buyer_message TEXT;

COMMENT ON COLUMN public.transactions.buyer_message IS 'Optional message from buyer to photographer';
