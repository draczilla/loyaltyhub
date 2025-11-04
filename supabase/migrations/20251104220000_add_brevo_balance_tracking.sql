/*
  # Add Brevo Account Balance Tracking and Monitoring

  ## Overview
  This migration adds comprehensive balance tracking for Brevo account credits and currency,
  with configurable thresholds for automated alerts. It also enables super admins to access
  all communication logs across tenants for monitoring purposes.

  ## New Tables

  ### `brevo_account_balance`
  - `id` (uuid, primary key) - Unique identifier
  - `email_credits` (numeric) - Available email credits in Brevo account
  - `sms_credits` (numeric) - Available SMS credits in Brevo account
  - `currency_balance` (numeric) - Currency balance in account
  - `total_spent` (numeric) - Total amount spent since account creation
  - `currency` (text) - Currency code (e.g., USD, EUR)
  - `last_sync_at` (timestamptz) - When this balance was fetched from Brevo API
  - `created_at` (timestamptz) - Creation timestamp

  ### `system_alerts`
  - `id` (uuid, primary key) - Unique identifier
  - `alert_type` (text) - Type of alert: balance_low, provider_switch, system_error
  - `severity` (text) - Alert severity: info, warning, critical
  - `title` (text) - Alert title
  - `message` (text) - Detailed alert message
  - `metadata` (jsonb) - Additional alert data
  - `sent_to_email` (text) - Email address alert was sent to
  - `sent_to_phone` (text) - Phone number alert was sent to
  - `acknowledged` (boolean) - Whether alert has been acknowledged
  - `acknowledged_by` (uuid) - Super admin who acknowledged
  - `acknowledged_at` (timestamptz) - When alert was acknowledged
  - `created_at` (timestamptz) - Creation timestamp

  ## Platform Settings Updates
  - Add `balance_thresholds` JSONB field to store email and SMS credit warning levels
  - Add `last_balance_check` timestamp to track when balance was last checked
  - Add `balance_monitoring_enabled` boolean to enable/disable automatic monitoring

  ## Security
  - Enable RLS on brevo_account_balance and system_alerts tables
  - Only super admins can read and write balance data
  - Super admins can read all communication_logs across all businesses
  - Add indexes for efficient querying and filtering

  ## Important Notes
  - Balance data is fetched from Brevo API via edge function
  - Alerts are triggered automatically when thresholds are breached
  - Historical balance data enables trend analysis and forecasting
*/

-- Create brevo_account_balance table
CREATE TABLE IF NOT EXISTS brevo_account_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_credits numeric DEFAULT 0,
  sms_credits numeric DEFAULT 0,
  currency_balance numeric DEFAULT 0,
  total_spent numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  last_sync_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brevo_account_balance ENABLE ROW LEVEL SECURITY;

-- Super admins can read balance data
CREATE POLICY "Super admins can read brevo balance"
  ON brevo_account_balance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Super admins can insert balance data
CREATE POLICY "Super admins can insert brevo balance"
  ON brevo_account_balance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_brevo_balance_created ON brevo_account_balance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brevo_balance_last_sync ON brevo_account_balance(last_sync_at DESC);

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('balance_low', 'provider_switch', 'system_error', 'threshold_warning')),
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_to_email text,
  sent_to_phone text,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES super_admins(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Super admins can read all system alerts
CREATE POLICY "Super admins can read system alerts"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Super admins can insert system alerts
CREATE POLICY "Super admins can insert system alerts"
  ON system_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Super admins can update system alerts (for acknowledgment)
CREATE POLICY "Super admins can update system alerts"
  ON system_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(acknowledged) WHERE acknowledged = false;

-- Add balance threshold fields to platform_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'balance_thresholds'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN balance_thresholds jsonb DEFAULT '{"email_credits": 1000, "sms_credits": 500}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'last_balance_check'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN last_balance_check timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'balance_monitoring_enabled'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN balance_monitoring_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Update default platform settings with balance thresholds
UPDATE platform_settings
SET
  balance_thresholds = '{"email_credits": 1000, "sms_credits": 500}'::jsonb,
  balance_monitoring_enabled = true
WHERE balance_thresholds IS NULL;

-- Add super admin policy to read all communication logs
CREATE POLICY "Super admins can read all communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Add indexes to communication_logs for efficient super admin queries
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_desc ON communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type_created ON communication_logs(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status_created ON communication_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_business_created ON communication_logs(business_id, created_at DESC);

-- Create function to get communication statistics
CREATE OR REPLACE FUNCTION get_communication_stats(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_business_id uuid DEFAULT NULL
)
RETURNS TABLE (
  total_count bigint,
  email_count bigint,
  sms_count bigint,
  sent_count bigint,
  failed_count bigint,
  pending_count bigint,
  brevo_email_count bigint,
  brevo_sms_count bigint,
  twilio_sms_count bigint,
  sendgrid_email_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE type = 'email')::bigint AS email_count,
    COUNT(*) FILTER (WHERE type = 'sms')::bigint AS sms_count,
    COUNT(*) FILTER (WHERE status = 'sent')::bigint AS sent_count,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_count,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending_count,
    COUNT(*) FILTER (WHERE type = 'email' AND provider = 'brevo')::bigint AS brevo_email_count,
    COUNT(*) FILTER (WHERE type = 'sms' AND provider = 'brevo')::bigint AS brevo_sms_count,
    COUNT(*) FILTER (WHERE type = 'sms' AND provider = 'twilio')::bigint AS twilio_sms_count,
    COUNT(*) FILTER (WHERE type = 'email' AND provider = 'sendgrid')::bigint AS sendgrid_email_count
  FROM communication_logs
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_business_id IS NULL OR business_id = p_business_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_communication_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE brevo_account_balance IS 'Tracks Brevo account balance snapshots for monitoring and trend analysis';
COMMENT ON TABLE system_alerts IS 'Stores system alerts for super admin notification and audit trail';
COMMENT ON COLUMN platform_settings.balance_thresholds IS 'JSON object containing email_credits and sms_credits threshold values';
COMMENT ON COLUMN platform_settings.last_balance_check IS 'Timestamp of last automatic balance check';
COMMENT ON COLUMN platform_settings.balance_monitoring_enabled IS 'Whether automatic balance monitoring and alerts are enabled';
COMMENT ON FUNCTION get_communication_stats IS 'Aggregates communication statistics for reporting and analytics';
