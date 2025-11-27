/*
  # Fix Function Search Path Security (Corrected)

  1. Security Improvements
    - Set fixed search_path on SECURITY DEFINER functions
    - Prevents search_path hijacking attacks
    - Ensures functions always use correct schema resolution

  2. Functions Updated
    - All overloaded versions of deduct_credits
    - All overloaded versions of add_credits
    - All overloaded versions of get_emails_sent_today
    - All overloaded versions of get_daily_email_allowance
    - All overloaded versions of get_daily_email_stats
    - get_tier_max_credits
    - check_credits_eligibility
    - grant_verification_credits
    - All overloaded versions of generate_unique_customer_id
    - update_brevo_sync_logs_updated_at

  3. Notes
    - Functions set to search_path = public
    - Uses ALTER FUNCTION with correct signatures
    - Critical for SECURITY DEFINER function safety
*/

-- Fix deduct_credits functions
ALTER FUNCTION deduct_credits(p_business_id uuid, p_amount integer, p_reason text)
SET search_path = public;

ALTER FUNCTION deduct_credits(p_business_id uuid, p_amount integer, p_reason text, p_admin_id uuid)
SET search_path = public;

ALTER FUNCTION deduct_credits(p_business_id uuid, p_amount integer, p_transaction_type text, p_reason text, p_metadata jsonb)
SET search_path = public;

-- Fix add_credits functions
ALTER FUNCTION add_credits(p_business_id uuid, p_amount integer, p_reason text, p_admin_id uuid)
SET search_path = public;

ALTER FUNCTION add_credits(p_business_id uuid, p_amount integer, p_admin_id uuid, p_reason text)
SET search_path = public;

ALTER FUNCTION add_credits(p_business_id uuid, p_amount integer, p_transaction_type text, p_reason text, p_admin_id uuid, p_metadata jsonb)
SET search_path = public;

-- Fix get_emails_sent_today functions
ALTER FUNCTION get_emails_sent_today()
SET search_path = public;

ALTER FUNCTION get_emails_sent_today(p_business_id uuid)
SET search_path = public;

-- Fix get_daily_email_allowance functions
ALTER FUNCTION get_daily_email_allowance()
SET search_path = public;

ALTER FUNCTION get_daily_email_allowance(p_business_id uuid)
SET search_path = public;

-- Fix get_daily_email_stats functions
ALTER FUNCTION get_daily_email_stats(p_days integer)
SET search_path = public;

ALTER FUNCTION get_daily_email_stats(p_business_id uuid)
SET search_path = public;

-- Fix get_tier_max_credits function
ALTER FUNCTION get_tier_max_credits(p_tier_id uuid)
SET search_path = public;

-- Fix check_credits_eligibility function
ALTER FUNCTION check_credits_eligibility(p_business_id uuid)
SET search_path = public;

-- Fix grant_verification_credits function
ALTER FUNCTION grant_verification_credits()
SET search_path = public;

-- Fix update_brevo_sync_logs_updated_at function
ALTER FUNCTION update_brevo_sync_logs_updated_at()
SET search_path = public;

-- Fix generate_unique_customer_id functions
ALTER FUNCTION generate_unique_customer_id()
SET search_path = public;

ALTER FUNCTION generate_unique_customer_id(business_prefix text)
SET search_path = public;

-- Add comments for documentation
COMMENT ON FUNCTION deduct_credits(p_business_id uuid, p_amount integer, p_reason text) 
IS 'SECURITY DEFINER function with fixed search_path to prevent hijacking';

COMMENT ON FUNCTION add_credits(p_business_id uuid, p_amount integer, p_reason text, p_admin_id uuid) 
IS 'SECURITY DEFINER function with fixed search_path to prevent hijacking';
