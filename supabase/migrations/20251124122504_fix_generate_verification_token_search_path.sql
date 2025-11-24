/*
  # Fix generate_verification_token Function Search Path

  ## Problem
  The generate_verification_token function fails with:
  "function gen_random_bytes(integer) does not exist"
  
  This happens because the function has search_path set to 'public' only,
  but gen_random_bytes is provided by the pgcrypto extension which may
  be in the 'extensions' schema.

  ## Solution
  Update the function's search_path to include both 'public' and 'extensions'
  schemas, and also use the pg_catalog prefix for built-in functions like
  encode and digest to ensure they're always found.

  ## Changes
  1. Update generate_verification_token to use proper search_path
  2. Explicitly reference pg_catalog for built-in functions
*/

-- Drop and recreate the function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_verification_token(
  p_business_id uuid,
  p_verification_type text,
  p_expiry_hours integer DEFAULT 24
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_token text;
  v_hashed_token text;
  v_expires_at timestamptz;
BEGIN
  -- Generate cryptographically secure random token
  -- Using gen_random_bytes from pgcrypto extension
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');

  -- Hash token for storage using digest from pgcrypto
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
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_verification_token(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_token(uuid, text, integer) TO service_role;

-- Also update the verify_token function to ensure it has proper search_path
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
        ELSE 'phone_verification'
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
        ELSE 'email_verification'
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_token(text, text) TO anon;

COMMENT ON FUNCTION public.generate_verification_token IS 'Generates a secure verification token for email or phone verification. Returns unhashed token for sending to user, stores hashed version in database.';
COMMENT ON FUNCTION public.verify_token IS 'Verifies an email or phone verification token. Marks the verification as complete if token is valid and not expired.';
