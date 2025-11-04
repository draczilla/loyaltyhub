/*
  # Add Daily Email Allowance Tracking

  ## Overview
  This migration replaces the credit-based email tracking with a daily allowance system
  that tracks Brevo's 300 free transactional emails per day limit. It adds functions
  to efficiently count daily email sends and calculate remaining allowance.

  ## New Functions

  ### `get_emails_sent_today()`
  - Counts emails sent from communication_logs since midnight UTC today
  - Filters for 'email' type and 'sent' status only
  - Returns integer count of emails sent

  ### `get_daily_email_allowance()`
  - Returns remaining email allowance for today
  - Calculates 300 minus emails sent today
  - Returns structured data with sent, remaining, and limit

  ### `get_daily_email_stats(p_days integer)`
  - Returns daily email statistics for past N days
  - Aggregates email sends by date for trending
  - Includes date, count, and percentage of limit

  ## Platform Settings Updates
  - Add `daily_email_limit` field (default 300)
  - Add `daily_email_warning_threshold` field (default 250)
  - Add `daily_email_reset_time` field (default '00:00:00 UTC')

  ## Indexes
  - Add optimized index on communication_logs for daily queries
  - Index on created_at with type and status filters

  ## Important Notes
  - All time calculations use UTC timezone
  - Daily reset happens at midnight UTC
  - Only counts emails with status 'sent'
  - Brevo free tier includes 300 transactional emails per day
  - Warning threshold set at 250 (83% of limit)
*/

-- Add daily email limit configuration to platform_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'daily_email_limit'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN daily_email_limit integer DEFAULT 300;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'daily_email_warning_threshold'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN daily_email_warning_threshold integer DEFAULT 250;
  END IF;
END $$;

-- Update default platform settings with daily email limits
UPDATE platform_settings
SET
  daily_email_limit = 300,
  daily_email_warning_threshold = 250
WHERE daily_email_limit IS NULL;

-- Create optimized index for daily email counting
CREATE INDEX IF NOT EXISTS idx_communication_logs_daily_emails
  ON communication_logs(created_at DESC)
  WHERE type = 'email' AND status = 'sent';

-- Function to count emails sent today
CREATE OR REPLACE FUNCTION get_emails_sent_today()
RETURNS integer AS $$
DECLARE
  email_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO email_count
  FROM communication_logs
  WHERE
    type = 'email'
    AND status = 'sent'
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    AND created_at < date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + interval '1 day';

  RETURN COALESCE(email_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get daily email allowance statistics
CREATE OR REPLACE FUNCTION get_daily_email_allowance()
RETURNS TABLE (
  sent_today integer,
  remaining_today integer,
  daily_limit integer,
  warning_threshold integer,
  percentage_used numeric,
  reset_time timestamptz
) AS $$
DECLARE
  v_limit integer;
  v_warning integer;
  v_sent integer;
BEGIN
  -- Get platform settings
  SELECT
    COALESCE(ps.daily_email_limit, 300),
    COALESCE(ps.daily_email_warning_threshold, 250)
  INTO v_limit, v_warning
  FROM platform_settings ps
  LIMIT 1;

  -- Get emails sent today
  v_sent := get_emails_sent_today();

  -- Return calculated values
  RETURN QUERY SELECT
    v_sent,
    GREATEST(v_limit - v_sent, 0),
    v_limit,
    v_warning,
    CASE WHEN v_limit > 0 THEN ROUND((v_sent::numeric / v_limit::numeric) * 100, 1) ELSE 0 END,
    date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get daily email statistics for past N days
CREATE OR REPLACE FUNCTION get_daily_email_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  email_count bigint,
  percentage_of_limit numeric
) AS $$
DECLARE
  v_limit integer;
BEGIN
  -- Get platform settings
  SELECT COALESCE(ps.daily_email_limit, 300)
  INTO v_limit
  FROM platform_settings ps
  LIMIT 1;

  RETURN QUERY
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS date,
    COUNT(*) AS email_count,
    CASE WHEN v_limit > 0 THEN ROUND((COUNT(*)::numeric / v_limit::numeric) * 100, 1) ELSE 0 END AS percentage_of_limit
  FROM communication_logs
  WHERE
    type = 'email'
    AND status = 'sent'
    AND created_at >= (now() AT TIME ZONE 'UTC' - (p_days || ' days')::interval)
  GROUP BY (created_at AT TIME ZONE 'UTC')::date
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_emails_sent_today TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_email_allowance TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_email_stats TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_emails_sent_today IS 'Returns count of emails sent today (UTC timezone)';
COMMENT ON FUNCTION get_daily_email_allowance IS 'Returns daily email allowance statistics including sent, remaining, and thresholds';
COMMENT ON FUNCTION get_daily_email_stats IS 'Returns daily email statistics for the past N days';
COMMENT ON COLUMN platform_settings.daily_email_limit IS 'Maximum number of emails allowed per day (Brevo free tier: 300)';
COMMENT ON COLUMN platform_settings.daily_email_warning_threshold IS 'Send warning when daily emails exceed this threshold';
