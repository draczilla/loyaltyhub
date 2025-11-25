/*
  # Add 30-Day Trial Period from Signup

  1. Changes
    - Sets trial_ends_at to 30 days from created_at for all businesses with trial subscription
    - Updates business insert triggers to automatically set trial_ends_at to 30 days from now
    - Backfills existing trial businesses with trial_ends_at = created_at + 30 days

  2. Security
    - No RLS changes needed
*/

-- Backfill existing trial businesses with 30-day trial period
UPDATE businesses
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE subscription_status = 'trial' 
  AND trial_ends_at IS NULL;

-- Create or replace function to set trial_ends_at on business creation
CREATE OR REPLACE FUNCTION set_trial_period()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If subscription_status is 'trial' and trial_ends_at is not set, set it to 30 days from now
  IF NEW.subscription_status = 'trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := now() + INTERVAL '30 days';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_trial_period_trigger ON businesses;

CREATE TRIGGER set_trial_period_trigger
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_period();
