-- Migration: Add trigger to auto-update photographer earnings on transaction completion
-- This fixes the issue where total_earnings in photographer_profiles was not being updated

-- =====================================================
-- 1. Drop existing trigger and function (cascade)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_auto_update_photographer_earnings ON public.transactions;
DROP FUNCTION IF EXISTS auto_update_photographer_earnings() CASCADE;

-- =====================================================
-- 2. Create function to update photographer earnings
-- =====================================================
CREATE OR REPLACE FUNCTION auto_update_photographer_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if payment_status is 'completed'
  IF NEW.payment_status = 'completed' THEN
    -- Check if this is a new completed transaction or status changed to completed
    IF (TG_OP = 'INSERT') OR
       (TG_OP = 'UPDATE' AND OLD.payment_status != 'completed') THEN

      UPDATE public.photographer_profiles
      SET
        total_photos_sold = total_photos_sold + 1,
        total_earnings = total_earnings + NEW.photographer_earnings
      WHERE id = NEW.photographer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. Create trigger on transactions table
-- =====================================================
DROP TRIGGER IF EXISTS trigger_auto_update_photographer_earnings ON public.transactions;

CREATE TRIGGER trigger_auto_update_photographer_earnings
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_photographer_earnings();

-- =====================================================
-- 4. Recalculate existing earnings (one-time fix)
-- =====================================================
-- This will fix the total_earnings for photographers who already have completed transactions

UPDATE public.photographer_profiles pp
SET
  total_earnings = COALESCE(
    (SELECT SUM(photographer_earnings)
     FROM public.transactions
     WHERE photographer_id = pp.id
     AND payment_status = 'completed'),
    0
  ),
  total_photos_sold = COALESCE(
    (SELECT COUNT(*)
     FROM public.transactions
     WHERE photographer_id = pp.id
     AND payment_status = 'completed'),
    0
  );
