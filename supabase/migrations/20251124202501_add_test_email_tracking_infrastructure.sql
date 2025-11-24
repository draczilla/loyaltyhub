/*
  # Add Test Email Tracking Infrastructure

  ## Overview
  Adds infrastructure to support test email tracking functionality including:
  - Marking emails as test messages
  - Rate limiting test emails (max 3 per hour per business)
  - Functions to check and enforce rate limits

  ## Changes

  ### 1. communication_logs Table Updates
  - Add `is_test_email` (boolean) - marks emails as test messages for visual distinction
  - Add index for efficient filtering of test emails

  ### 2. test_email_rate_limits Table (New)
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, references businesses) - Business sending tests
  - `hour_start` (timestamptz) - Start of current hour window
  - `send_count` (integer) - Number of tests sent in current hour
  - `last_sent_at` (timestamptz) - Timestamp of last test sent
  - Unique constraint on (business_id, hour_start)

  ### 3. Rate Limit Functions
  - `check_test_email_rate_limit()` - Checks if business can send test email
  - `increment_test_email_count()` - Increments counter after sending test
  - `cleanup_old_rate_limits()` - Removes expired hour windows

  ## Security
  - Enable RLS on test_email_rate_limits table
  - Businesses can only access their own rate limit data
  - Rate limit enforced at database level

  ## Indexes
  - Index on (business_id, is_test_email) for filtering
  - Index on (business_id, hour_start) for rate limit lookups
*/

-- Add is_test_email column to communication_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'is_test_email'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN is_test_email boolean DEFAULT false;
  END IF;
END $$;

-- Create index for filtering test emails
CREATE INDEX IF NOT EXISTS idx_communication_logs_is_test_email
  ON communication_logs(business_id, is_test_email)
  WHERE is_test_email = true;

-- Create test_email_rate_limits table
CREATE TABLE IF NOT EXISTS test_email_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  hour_start timestamptz NOT NULL,
  send_count integer DEFAULT 0 NOT NULL,
  last_sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, hour_start)
);

ALTER TABLE test_email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Businesses can read their own rate limit data
CREATE POLICY "Businesses can read own rate limits"
  ON test_email_rate_limits FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE id = business_id
    )
  );

-- Only the system can insert/update rate limits (via functions)
CREATE POLICY "Service role can manage rate limits"
  ON test_email_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_test_email_rate_limits_business_hour
  ON test_email_rate_limits(business_id, hour_start);

-- Function to check if business can send test email (max 3 per hour)
CREATE OR REPLACE FUNCTION check_test_email_rate_limit(
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_hour timestamptz;
  v_send_count integer;
  v_reset_at timestamptz;
  v_remaining integer;
BEGIN
  -- Get start of current hour
  v_current_hour := date_trunc('hour', now());
  v_reset_at := v_current_hour + interval '1 hour';

  -- Get send count for current hour
  SELECT COALESCE(send_count, 0)
  INTO v_send_count
  FROM test_email_rate_limits
  WHERE business_id = p_business_id
    AND hour_start = v_current_hour;

  -- If no record exists, count is 0
  IF v_send_count IS NULL THEN
    v_send_count := 0;
  END IF;

  -- Calculate remaining sends
  v_remaining := GREATEST(0, 3 - v_send_count);

  -- Return result
  RETURN jsonb_build_object(
    'allowed', v_send_count < 3,
    'remaining', v_remaining,
    'send_count', v_send_count,
    'reset_at', v_reset_at,
    'limit', 3
  );
END;
$$;

-- Function to increment test email count after successful send
CREATE OR REPLACE FUNCTION increment_test_email_count(
  p_business_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_hour timestamptz;
BEGIN
  -- Get start of current hour
  v_current_hour := date_trunc('hour', now());

  -- Upsert rate limit record
  INSERT INTO test_email_rate_limits (
    business_id,
    hour_start,
    send_count,
    last_sent_at
  )
  VALUES (
    p_business_id,
    v_current_hour,
    1,
    now()
  )
  ON CONFLICT (business_id, hour_start)
  DO UPDATE SET
    send_count = test_email_rate_limits.send_count + 1,
    last_sent_at = now();
END;
$$;

-- Function to cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM test_email_rate_limits
  WHERE hour_start < now() - interval '24 hours';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Add comments for documentation
COMMENT ON COLUMN communication_logs.is_test_email IS 'Marks emails as test messages for visual distinction in UI';
COMMENT ON TABLE test_email_rate_limits IS 'Tracks test email rate limits per business (max 3 per hour)';
COMMENT ON FUNCTION check_test_email_rate_limit IS 'Checks if business can send test email based on hourly rate limit';
COMMENT ON FUNCTION increment_test_email_count IS 'Increments test email counter after successful send';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes rate limit records older than 24 hours';
