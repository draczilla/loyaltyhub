/*
  # Fix verify_token Function Onboarding Status Values

  ## Problem
  The verify_token function fails with a check constraint violation because it tries
  to set onboarding_status to 'phone_verification' and 'email_verification', which
  are not valid values according to the businesses_onboarding_status_check constraint.

  Valid values are: 'pending_email', 'pending_phone', 'completed', 'skipped'

  ## Solution
  Update the verify_token function to use the correct onboarding_status values:
  - Use 'pending_phone' instead of 'phone_verification'
  - Use 'pending_email' instead of 'email_verification'
  - Use 'completed' when both verifications are done

  ## Changes
  1. Update verify_token function to use correct status values
*/

CREATE OR REPLACE FUNCTION public.verify_token(
  p_token text,
  p_verification_type text
)
RETURNS TABLE (
  success boolean,
  business_id uuid,
  message text,
  next_step text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_hashed_token text;
  v_business_id uuid;
  v_expires_at timestamptz;
  v_email_verified boolean;
  v_phone_verified boolean;
BEGIN
  -- Hash the provided token to compare with stored hash
  v_hashed_token := encode(digest(p_token, 'sha256'), 'hex');

  -- Find business with matching token
  IF p_verification_type = 'email' THEN
    SELECT
      b.id,
      b.email_verification_expires,
      b.email_verified,
      b.phone_verified
    INTO
      v_business_id,
      v_expires_at,
      v_email_verified,
      v_phone_verified
    FROM businesses b
    WHERE b.email_verification_token = v_hashed_token;
  ELSIF p_verification_type = 'phone' THEN
    SELECT
      b.id,
      b.phone_verification_expires,
      b.email_verified,
      b.phone_verified
    INTO
      v_business_id,
      v_expires_at,
      v_email_verified,
      v_phone_verified
    FROM businesses b
    WHERE b.phone_verification_token = v_hashed_token;
  END IF;

  -- Check if token was found
  IF v_business_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid or expired verification token', 'request_new';
    RETURN;
  END IF;

  -- Check if token has expired
  IF v_expires_at < now() THEN
    RETURN QUERY SELECT false, v_business_id, 'Verification token has expired', 'request_new';
    RETURN;
  END IF;

  -- Mark as verified
  IF p_verification_type = 'email' THEN
    UPDATE businesses
    SET
      email_verified = true,
      email_verification_token = NULL,
      email_verification_expires = NULL,
      onboarding_status = CASE
        WHEN phone_verified THEN 'completed'
        ELSE 'pending_phone'
      END,
      onboarding_completed_at = CASE
        WHEN phone_verified THEN now()
        ELSE NULL
      END
    WHERE id = v_business_id;

    -- Determine next step
    IF v_phone_verified THEN
      RETURN QUERY SELECT true, v_business_id, 'Email verified successfully! Your account is now fully activated.', 'dashboard';
    ELSE
      RETURN QUERY SELECT true, v_business_id, 'Email verified successfully! Please verify your phone number to complete setup.', 'phone_verification';
    END IF;
  ELSIF p_verification_type = 'phone' THEN
    UPDATE businesses
    SET
      phone_verified = true,
      phone_verification_token = NULL,
      phone_verification_expires = NULL,
      onboarding_status = CASE
        WHEN email_verified THEN 'completed'
        ELSE 'pending_email'
      END,
      onboarding_completed_at = CASE
        WHEN email_verified THEN now()
        ELSE NULL
      END
    WHERE id = v_business_id;

    -- Determine next step
    IF v_email_verified THEN
      RETURN QUERY SELECT true, v_business_id, 'Phone verified successfully! Your account is now fully activated.', 'dashboard';
    ELSE
      RETURN QUERY SELECT true, v_business_id, 'Phone verified successfully! Please verify your email to complete setup.', 'email_verification';
    END IF;
  END IF;
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.verify_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_token(text, text) TO anon;

COMMENT ON FUNCTION public.verify_token IS 'Verifies an email or phone verification token. Marks the verification as complete if token is valid and not expired. Uses correct onboarding_status values: pending_email, pending_phone, completed.';
