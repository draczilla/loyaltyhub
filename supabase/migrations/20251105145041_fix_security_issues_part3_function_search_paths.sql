/*
  # Fix Security Issues - Part 3: Function Search Path Security

  ## Changes Made
  
  ### 1. Fix Function Search Paths
  All functions updated to use immutable search_path for security.
  Setting search_path explicitly prevents malicious schema manipulation attacks.
  
  Functions fixed (19 total):
  - count_active_tenant_members
  - generate_redemption_code
  - track_program_enrollment
  - get_tenant_seat_limit
  - can_invite_member
  - is_user_tenant_admin
  - update_platform_settings_updated_at
  - deduct_credits
  - add_credits
  - get_emails_sent_today
  - get_daily_email_allowance
  - get_daily_email_stats
  - create_default_email_templates
  - check_verification_rate_limit
  - generate_verification_token
  - verify_token
  - get_tenant_data_export
  - delete_tenant_and_data
  - generate_unique_customer_id
  
  ### 2. Security Impact
  - Prevents search_path manipulation attacks
  - Ensures functions always reference correct schemas
  - Follows PostgreSQL security best practices
  
  ## Important Notes
  - Each function now has SET search_path = public
  - Maintains SECURITY DEFINER where needed
  - No functional changes, only security hardening
*/

-- Drop all functions that will be recreated (CASCADE for trigger functions)
DROP FUNCTION IF EXISTS count_active_tenant_members(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_redemption_code() CASCADE;
DROP FUNCTION IF EXISTS track_program_enrollment() CASCADE;
DROP FUNCTION IF EXISTS get_tenant_seat_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_invite_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_user_tenant_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS update_platform_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS deduct_credits(uuid, integer, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS add_credits(uuid, integer, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_emails_sent_today(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_daily_email_allowance(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_daily_email_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_default_email_templates(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_verification_rate_limit(text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_verification_token(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS verify_token(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_data_export(uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_tenant_and_data(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS generate_unique_customer_id() CASCADE;

-- =====================================================
-- TENANT AND TEAM MANAGEMENT FUNCTIONS
-- =====================================================

CREATE FUNCTION count_active_tenant_members(tenant_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM tenant_members
    WHERE tenant_id = tenant_uuid
    AND status = 'active'
  );
END;
$$;

CREATE FUNCTION get_tenant_seat_limit(tenant_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat_limit integer;
BEGIN
  SELECT (st.features->>'max_seats')::integer INTO seat_limit
  FROM tenants t
  JOIN businesses b ON b.tenant_id = t.id
  JOIN subscription_tiers st ON st.id = b.tier_id
  WHERE t.id = tenant_uuid
  LIMIT 1;
  
  RETURN COALESCE(seat_limit, 1);
END;
$$;

CREATE FUNCTION can_invite_member(tenant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_members integer;
  max_seats integer;
BEGIN
  current_members := count_active_tenant_members(tenant_uuid);
  max_seats := get_tenant_seat_limit(tenant_uuid);
  
  RETURN current_members < max_seats;
END;
$$;

CREATE FUNCTION is_user_tenant_admin(tenant_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenants
    WHERE id = tenant_uuid
    AND admin_user_id = user_uuid
  );
END;
$$;

-- =====================================================
-- PLATFORM SETTINGS FUNCTIONS
-- =====================================================

CREATE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_platform_settings_updated_at_trigger
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

-- =====================================================
-- CREDIT MANAGEMENT FUNCTIONS
-- =====================================================

CREATE FUNCTION deduct_credits(
  p_business_id uuid,
  p_amount integer,
  p_reason text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT sms_credits INTO current_balance
  FROM businesses
  WHERE id = p_business_id
  FOR UPDATE;
  
  IF current_balance < p_amount THEN
    RETURN false;
  END IF;
  
  UPDATE businesses
  SET sms_credits = sms_credits - p_amount
  WHERE id = p_business_id;
  
  INSERT INTO credit_transactions (
    business_id,
    amount,
    transaction_type,
    reason,
    admin_id
  ) VALUES (
    p_business_id,
    -p_amount,
    'deduction',
    p_reason,
    p_admin_id
  );
  
  RETURN true;
END;
$$;

CREATE FUNCTION add_credits(
  p_business_id uuid,
  p_amount integer,
  p_reason text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET sms_credits = sms_credits + p_amount
  WHERE id = p_business_id;
  
  INSERT INTO credit_transactions (
    business_id,
    amount,
    transaction_type,
    reason,
    admin_id
  ) VALUES (
    p_business_id,
    p_amount,
    'addition',
    p_reason,
    p_admin_id
  );
END;
$$;

-- =====================================================
-- EMAIL ALLOWANCE FUNCTIONS
-- =====================================================

CREATE FUNCTION get_emails_sent_today(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO email_count
  FROM communication_logs
  WHERE business_id = p_business_id
    AND type = 'email'
    AND status = 'sent'
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  
  RETURN COALESCE(email_count, 0);
END;
$$;

CREATE FUNCTION get_daily_email_allowance(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowance integer;
BEGIN
  SELECT COALESCE((st.features->>'daily_emails')::integer, 0) INTO allowance
  FROM businesses b
  JOIN subscription_tiers st ON st.id = b.tier_id
  WHERE b.id = p_business_id;
  
  RETURN COALESCE(allowance, 0);
END;
$$;

CREATE FUNCTION get_daily_email_stats(p_business_id uuid)
RETURNS TABLE (
  sent_today integer,
  daily_limit integer,
  remaining integer,
  can_send boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent integer;
  v_limit integer;
  v_remaining integer;
  v_can_send boolean;
BEGIN
  v_sent := get_emails_sent_today(p_business_id);
  v_limit := get_daily_email_allowance(p_business_id);
  v_remaining := GREATEST(0, v_limit - v_sent);
  v_can_send := v_remaining > 0;
  
  RETURN QUERY SELECT v_sent, v_limit, v_remaining, v_can_send;
END;
$$;

-- =====================================================
-- EMAIL TEMPLATE FUNCTIONS
-- =====================================================

CREATE FUNCTION create_default_email_templates(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO email_templates (business_id, template_type, subject, body_html, is_default)
  VALUES
    (p_business_id, 'welcome', 'Welcome to {{business_name}}!', '<p>Welcome to our loyalty program!</p>', true),
    (p_business_id, 'reward_earned', 'You earned a reward!', '<p>Congratulations on earning a reward!</p>', true),
    (p_business_id, 'points_earned', 'Points added to your account', '<p>You earned {{points}} points!</p>', true)
  ON CONFLICT (business_id, template_type) WHERE is_default = true
  DO NOTHING;
END;
$$;

-- =====================================================
-- VERIFICATION FUNCTIONS
-- =====================================================

CREATE FUNCTION check_verification_rate_limit(
  p_identifier text,
  p_verification_type text,
  p_time_window_minutes integer DEFAULT 60,
  p_max_attempts integer DEFAULT 5
)
RETURNS TABLE (
  allowed boolean,
  attempts_count bigint,
  next_allowed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_attempts_count bigint;
  v_window_start timestamptz;
  v_next_allowed timestamptz;
BEGIN
  v_window_start := now() - (p_time_window_minutes || ' minutes')::interval;

  SELECT COUNT(*) INTO v_attempts_count
  FROM verification_attempts
  WHERE
    identifier = p_identifier
    AND verification_type = p_verification_type
    AND created_at >= v_window_start;

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
$$;

CREATE FUNCTION generate_verification_token(
  p_business_id uuid,
  p_verification_type text,
  p_expiry_hours integer DEFAULT 24
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_hashed_token text;
  v_expires_at timestamptz;
BEGIN
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  v_hashed_token := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + (p_expiry_hours || ' hours')::interval;

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

  RETURN v_token;
END;
$$;

CREATE FUNCTION verify_token(
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
SET search_path = public
AS $$
DECLARE
  v_hashed_token text;
  v_business_record RECORD;
  v_success boolean := false;
  v_message text;
  v_next_step text;
BEGIN
  v_hashed_token := encode(digest(p_token, 'sha256'), 'hex');

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
$$;

-- =====================================================
-- TENANT DATA EXPORT AND DELETION FUNCTIONS
-- =====================================================

CREATE FUNCTION get_tenant_data_export(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  export_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tenant', (SELECT row_to_json(t) FROM tenants t WHERE id = p_tenant_id),
    'members', (SELECT jsonb_agg(row_to_json(tm)) FROM tenant_members tm WHERE tenant_id = p_tenant_id),
    'businesses', (SELECT jsonb_agg(row_to_json(b)) FROM businesses b WHERE tenant_id = p_tenant_id),
    'exported_at', now()
  ) INTO export_data;
  
  RETURN export_data;
END;
$$;

CREATE FUNCTION delete_tenant_and_data(
  p_tenant_id uuid,
  p_deleted_by uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  export_data jsonb;
BEGIN
  export_data := get_tenant_data_export(p_tenant_id);
  
  INSERT INTO tenant_deletions (
    tenant_id,
    deleted_by,
    reason,
    data_export
  ) VALUES (
    p_tenant_id,
    p_deleted_by,
    p_reason,
    export_data
  );
  
  DELETE FROM tenants WHERE id = p_tenant_id;
  
  RETURN true;
END;
$$;

-- =====================================================
-- CUSTOMER ID GENERATION FUNCTION
-- =====================================================

CREATE FUNCTION generate_unique_customer_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    new_id := 'CUST-' || upper(substring(md5(random()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM customers WHERE unique_customer_id = new_id) INTO id_exists;
    
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- =====================================================
-- LOYALTY PROGRAM FUNCTIONS
-- =====================================================

CREATE FUNCTION generate_redemption_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    SELECT EXISTS(
      SELECT 1 FROM customer_rewards 
      WHERE redemption_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

CREATE FUNCTION track_program_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO customer_program_progress (
    customer_id,
    program_id,
    current_points,
    visits_count
  ) VALUES (
    NEW.customer_id,
    NEW.program_id,
    0,
    0
  ) ON CONFLICT (customer_id, program_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger for track_program_enrollment
CREATE TRIGGER auto_enroll_customer_in_program
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION track_program_enrollment();
