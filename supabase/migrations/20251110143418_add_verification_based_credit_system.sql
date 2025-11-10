/*
  # Add Verification-Based Credit System

  ## Summary
  This migration implements a credit gating system that requires email and phone verification
  before credits are released to users. The system handles different subscription tiers with
  different requirements for credit release.

  ## Changes Made

  ### 1. Database Functions
  - `get_tier_max_credits`: Retrieves maximum credits for a given tier from subscription_tiers
  - `grant_verification_credits`: Automatically grants credits when verification is complete
  - `check_credits_eligibility`: Checks if user is eligible to receive credits

  ### 2. Database Triggers
  - Trigger on businesses table to automatically grant credits when both verifications complete
  - For Free tier: grants credits immediately after verification
  - For Pro/Agency tiers: requires active subscription status before granting credits

  ### 3. Updates to Existing Data
  - Set credits_remaining to 0 for all unverified users
  - Maintain existing credits for already verified users
  - Add verification_completed_at timestamp for newly verified users

  ## Important Notes
  - Free tier users receive credits after verification only
  - Pro and Agency tier users require verification AND active subscription
  - Existing verified users maintain their current credits and status
  - New signups default to 0 credits until verification is complete
*/

-- Function to get maximum credits for a tier
CREATE OR REPLACE FUNCTION get_tier_max_credits(p_tier_id uuid)
RETURNS integer AS $$
DECLARE
  v_max_credits integer;
BEGIN
  SELECT 
    COALESCE((features->>'max_credits')::integer, max_sms_monthly) 
  INTO v_max_credits
  FROM subscription_tiers
  WHERE id = p_tier_id;
  
  RETURN COALESCE(v_max_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is eligible for credits
CREATE OR REPLACE FUNCTION check_credits_eligibility(p_business_id uuid)
RETURNS TABLE (
  eligible boolean,
  reason text,
  credits_to_grant integer
) AS $$
DECLARE
  v_business RECORD;
  v_tier_name text;
  v_max_credits integer;
  v_eligible boolean := false;
  v_reason text := 'Unknown';
  v_credits integer := 0;
BEGIN
  -- Get business details
  SELECT 
    b.email_verified,
    b.phone_verified,
    b.subscription_status,
    b.tier_id,
    b.credits_remaining,
    t.name as tier_name
  INTO v_business
  FROM businesses b
  JOIN subscription_tiers t ON b.tier_id = t.id
  WHERE b.id = p_business_id;

  IF NOT FOUND THEN
    v_reason := 'Business not found';
    RETURN QUERY SELECT v_eligible, v_reason, v_credits;
    RETURN;
  END IF;

  v_tier_name := v_business.tier_name;

  -- Check verification status
  IF NOT v_business.email_verified THEN
    v_reason := 'Email verification required';
    RETURN QUERY SELECT v_eligible, v_reason, v_credits;
    RETURN;
  END IF;

  IF NOT v_business.phone_verified THEN
    v_reason := 'Phone verification required';
    RETURN QUERY SELECT v_eligible, v_reason, v_credits;
    RETURN;
  END IF;

  -- Get max credits for tier
  v_max_credits := get_tier_max_credits(v_business.tier_id);

  -- Check tier-specific requirements
  IF v_tier_name = 'Free' THEN
    -- Free tier only needs verification
    v_eligible := true;
    v_credits := v_max_credits;
    v_reason := 'Eligible - Free tier verified';
  ELSIF v_tier_name IN ('Pro', 'Agency') THEN
    -- Paid tiers need verification AND active subscription
    IF v_business.subscription_status = 'active' THEN
      v_eligible := true;
      v_credits := v_max_credits;
      v_reason := 'Eligible - Paid tier verified and subscription active';
    ELSE
      v_reason := 'Active subscription required for ' || v_tier_name || ' tier';
    END IF;
  ELSE
    v_reason := 'Unknown tier type';
  END IF;

  RETURN QUERY SELECT v_eligible, v_reason, v_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to grant credits when verification is complete
CREATE OR REPLACE FUNCTION grant_verification_credits()
RETURNS TRIGGER AS $$
DECLARE
  v_eligibility RECORD;
  v_already_granted boolean;
BEGIN
  -- Only proceed if both verifications are now complete
  IF NEW.email_verified AND NEW.phone_verified THEN
    -- Check if we've already granted credits (don't re-grant on updates)
    v_already_granted := (OLD.email_verified AND OLD.phone_verified AND OLD.credits_remaining > 0);
    
    IF NOT v_already_granted THEN
      -- Check eligibility
      SELECT * INTO v_eligibility
      FROM check_credits_eligibility(NEW.id);

      IF v_eligibility.eligible THEN
        -- Grant credits
        NEW.credits_remaining := v_eligibility.credits_to_grant;
        
        -- Set verification completed timestamp if not already set
        IF NEW.verification_completed_at IS NULL THEN
          NEW.verification_completed_at := now();
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic credit granting
DROP TRIGGER IF EXISTS grant_credits_on_verification ON businesses;
CREATE TRIGGER grant_credits_on_verification
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  WHEN (NEW.email_verified AND NEW.phone_verified)
  EXECUTE FUNCTION grant_verification_credits();

-- Add verification_completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'verification_completed_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN verification_completed_at timestamptz;
  END IF;
END $$;

-- Update existing data: set verification_completed_at for already verified users
UPDATE businesses
SET verification_completed_at = COALESCE(onboarding_completed_at, created_at)
WHERE email_verified = true 
  AND phone_verified = true 
  AND verification_completed_at IS NULL;

-- Set credits to 0 for unverified users (don't touch already verified users)
UPDATE businesses
SET credits_remaining = 0
WHERE (email_verified = false OR phone_verified = false)
  AND credits_remaining > 0;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tier_max_credits TO authenticated;
GRANT EXECUTE ON FUNCTION check_credits_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION grant_verification_credits TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_tier_max_credits IS 'Returns maximum credits allowed for a subscription tier';
COMMENT ON FUNCTION check_credits_eligibility IS 'Checks if business is eligible to receive credits based on verification and subscription status';
COMMENT ON FUNCTION grant_verification_credits IS 'Trigger function that automatically grants credits when both email and phone are verified';
COMMENT ON COLUMN businesses.verification_completed_at IS 'Timestamp when both email and phone verification were completed';
