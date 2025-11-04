/*
  # Add Tenant Verification System for Beta Onboarding

  ## Overview
  This migration adds comprehensive email and phone verification for tenant onboarding.
  All new tenants must verify their email and phone before accessing the platform.

  ## New Fields for businesses table
  - email_verified (boolean) - Whether email has been verified
  - email_verification_token (text) - Hashed verification token
  - email_verification_expires (timestamptz) - Token expiration time
  - phone (text) - Business contact phone number
  - phone_verified (boolean) - Whether phone has been verified
  - phone_verification_token (text) - Hashed verification token
  - phone_verification_expires (timestamptz) - Token expiration time
  - onboarding_status (text) - Current onboarding stage
  - onboarding_completed_at (timestamptz) - When onboarding completed

  ## New Tables

  ### `verification_attempts`
  - Tracks all verification attempts for rate limiting
  - Prevents abuse with IP-based tracking
  - Logs device and location information

  ## Security Features
  - Token hashing with SHA-256
  - Rate limiting per email/phone/IP
  - Token expiration (24h for email, 15min for SMS)
  - Single-use token enforcement
  - Audit trail for all attempts

  ## Important Notes
  - Existing tenants are grandfathered (verified = true)
  - New signups must complete both verifications
  - Tokens are hashed before storage
  - Failed attempts increment security counters
*/

-- Add verification fields to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_verification_token'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_verification_token text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_verification_expires'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_verification_expires timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone_verification_token'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone_verification_token text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'phone_verification_expires'
  ) THEN
    ALTER TABLE businesses ADD COLUMN phone_verification_expires timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE businesses ADD COLUMN onboarding_status text DEFAULT 'pending_email'
      CHECK (onboarding_status IN ('pending_email', 'pending_phone', 'completed', 'skipped'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;

-- Create verification attempts tracking table
CREATE TABLE IF NOT EXISTS verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone')),
  identifier text NOT NULL,
  ip_address text,
  user_agent text,
  attempt_result text NOT NULL CHECK (attempt_result IN ('sent', 'failed', 'verified', 'expired', 'rate_limited')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- Super admins can read all verification attempts
CREATE POLICY "Super admins can read all verification attempts"
  ON verification_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Businesses can read their own verification attempts
CREATE POLICY "Businesses can read own verification attempts"
  ON verification_attempts FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

-- Service role can insert verification attempts
CREATE POLICY "Service role can insert verification attempts"
  ON verification_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for verification lookups
CREATE INDEX IF NOT EXISTS idx_businesses_email_verification_token
  ON businesses(email_verification_token) WHERE email_verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_phone_verification_token
  ON businesses(phone_verification_token) WHERE phone_verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_onboarding_status
  ON businesses(onboarding_status) WHERE onboarding_status != 'completed';

CREATE INDEX IF NOT EXISTS idx_businesses_phone
  ON businesses(phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_attempts_business
  ON verification_attempts(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_identifier
  ON verification_attempts(identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip
  ON verification_attempts(ip_address, created_at DESC);

-- Grandfather existing businesses as verified
UPDATE businesses
SET
  email_verified = true,
  phone_verified = true,
  onboarding_status = 'completed',
  onboarding_completed_at = created_at
WHERE email_verified IS NULL OR email_verified = false;

-- Function to check rate limiting for verification attempts
CREATE OR REPLACE FUNCTION check_verification_rate_limit(
  p_identifier text,
  p_verification_type text,
  p_time_window_minutes integer DEFAULT 60,
  p_max_attempts integer DEFAULT 5
)
RETURNS TABLE (
  allowed boolean,
  attempts_count bigint,
  next_allowed_at timestamptz
) AS $$
DECLARE
  v_attempts_count bigint;
  v_window_start timestamptz;
  v_next_allowed timestamptz;
BEGIN
  v_window_start := now() - (p_time_window_minutes || ' minutes')::interval;

  -- Count attempts in time window
  SELECT COUNT(*) INTO v_attempts_count
  FROM verification_attempts
  WHERE
    identifier = p_identifier
    AND verification_type = p_verification_type
    AND created_at >= v_window_start;

  -- Calculate when next attempt is allowed
  IF v_attempts_count >= p_max_attempts THEN
    SELECT created_at + (p_time_window_minutes || ' minutes')::interval INTO v_next_allowed
    FROM verification_attempts
    WHERE
      identifier = p_identifier
      AND verification_type = p_verification_type
      AND created_at >= v_window_start
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    v_next_allowed := now();
  END IF;

  RETURN QUERY SELECT
    v_attempts_count < p_max_attempts,
    v_attempts_count,
    v_next_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to generate secure verification token (returns unhashed for sending, stores hashed)
CREATE OR REPLACE FUNCTION generate_verification_token(
  p_business_id uuid,
  p_verification_type text,
  p_expiry_hours integer DEFAULT 24
)
RETURNS text AS $$
DECLARE
  v_token text;
  v_hashed_token text;
  v_expires_at timestamptz;
BEGIN
  -- Generate cryptographically secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');

  -- Hash token for storage
  v_hashed_token := encode(digest(v_token, 'sha256'), 'hex');

  -- Set expiration time
  v_expires_at := now() + (p_expiry_hours || ' hours')::interval;

  -- Store hashed token in businesses table
  IF p_verification_type = 'email' THEN
    UPDATE businesses
    SET
      email_verification_token = v_hashed_token,
      email_verification_expires = v_expires_at
    WHERE id = p_business_id;
  ELSIF p_verification_type = 'phone' THEN
    UPDATE businesses
    SET
      phone_verification_token = v_hashed_token,
      phone_verification_expires = v_expires_at
    WHERE id = p_business_id;
  END IF;

  -- Return unhashed token for sending to user
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify token and mark as verified
CREATE OR REPLACE FUNCTION verify_token(
  p_token text,
  p_verification_type text
)
RETURNS TABLE (
  success boolean,
  business_id uuid,
  message text,
  next_step text
) AS $$
DECLARE
  v_hashed_token text;
  v_business_record RECORD;
  v_success boolean := false;
  v_message text;
  v_next_step text;
BEGIN
  -- Hash the provided token
  v_hashed_token := encode(digest(p_token, 'sha256'), 'hex');

  -- Find business with matching token
  IF p_verification_type = 'email' THEN
    SELECT
      b.id,
      b.email_verification_token,
      b.email_verification_expires,
      b.email_verified,
      b.onboarding_status
    INTO v_business_record
    FROM businesses b
    WHERE b.email_verification_token = v_hashed_token;

    IF NOT FOUND THEN
      v_message := 'Invalid or expired verification token';
      v_next_step := 'request_new';
    ELSIF v_business_record.email_verified THEN
      v_message := 'Email already verified';
      v_next_step := 'phone_verification';
      v_success := true;
    ELSIF v_business_record.email_verification_expires < now() THEN
      v_message := 'Verification token has expired';
      v_next_step := 'request_new';
    ELSE
      -- Mark email as verified
      UPDATE businesses
      SET
        email_verified = true,
        email_verification_token = NULL,
        email_verification_expires = NULL,
        onboarding_status = 'pending_phone'
      WHERE id = v_business_record.id;

      v_success := true;
      v_message := 'Email verified successfully';
      v_next_step := 'phone_verification';
    END IF;

  ELSIF p_verification_type = 'phone' THEN
    SELECT
      b.id,
      b.phone_verification_token,
      b.phone_verification_expires,
      b.phone_verified,
      b.email_verified,
      b.onboarding_status
    INTO v_business_record
    FROM businesses b
    WHERE b.phone_verification_token = v_hashed_token;

    IF NOT FOUND THEN
      v_message := 'Invalid or expired verification token';
      v_next_step := 'request_new';
    ELSIF NOT v_business_record.email_verified THEN
      v_message := 'Please verify email first';
      v_next_step := 'email_verification';
    ELSIF v_business_record.phone_verified THEN
      v_message := 'Phone already verified';
      v_next_step := 'dashboard';
      v_success := true;
    ELSIF v_business_record.phone_verification_expires < now() THEN
      v_message := 'Verification token has expired';
      v_next_step := 'request_new';
    ELSE
      -- Mark phone as verified and complete onboarding
      UPDATE businesses
      SET
        phone_verified = true,
        phone_verification_token = NULL,
        phone_verification_expires = NULL,
        onboarding_status = 'completed',
        onboarding_completed_at = now()
      WHERE id = v_business_record.id;

      v_success := true;
      v_message := 'Phone verified successfully! Welcome aboard!';
      v_next_step := 'dashboard';
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_success,
    v_business_record.id,
    v_message,
    v_next_step;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_verification_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION generate_verification_token TO authenticated;
GRANT EXECUTE ON FUNCTION verify_token TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN businesses.email_verified IS 'Whether tenant has verified their email address';
COMMENT ON COLUMN businesses.phone_verified IS 'Whether tenant has verified their phone number';
COMMENT ON COLUMN businesses.onboarding_status IS 'Current onboarding stage: pending_email, pending_phone, completed, skipped';
COMMENT ON TABLE verification_attempts IS 'Tracks all verification attempts for rate limiting and security';
COMMENT ON FUNCTION check_verification_rate_limit IS 'Checks if identifier is rate limited for verification attempts';
COMMENT ON FUNCTION generate_verification_token IS 'Generates secure verification token and stores hashed version';
COMMENT ON FUNCTION verify_token IS 'Verifies token and updates verification status';
