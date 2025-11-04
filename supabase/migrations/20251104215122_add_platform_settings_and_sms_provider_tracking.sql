/*
  # Add Platform Settings and SMS Provider Tracking

  ## Overview
  This migration creates a centralized platform settings table for SMS provider configuration
  and system alert management. It also enhances SMS tracking with provider information.

  ## New Tables

  ### `platform_settings`
  - `id` (uuid, primary key) - Unique identifier
  - `primary_sms_provider` (text) - Primary SMS provider: brevo or twilio
  - `sms_provider_status` (jsonb) - Status tracking for each provider
  - `alert_email` (text) - Email address for system alerts
  - `alert_phone` (text) - Phone number for system alerts
  - `last_provider_switch_at` (timestamptz) - Last time provider was switched
  - `provider_switch_count` (integer) - Number of provider switches
  - `settings` (jsonb) - Additional platform configuration
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ## Table Updates

  ### `communication_logs` enhancements
  - Add `provider` field to track which SMS provider was used
  - Add `provider_message_id` field for provider-specific message tracking
  - Add `failure_attempt_count` to track retry attempts

  ### `sms_logs` enhancements
  - Add `provider` field to distinguish between brevo and twilio
  - Update indexes for provider-based queries

  ## Security
  - Enable RLS on platform_settings table
  - Only super admins can access platform_settings
  - All other tables maintain existing security policies

  ## Important Notes
  - Platform settings initialized with brevo as primary provider
  - Provider status tracks health and last successful send for each provider
  - Alert fields are optional and can be configured via Super Admin UI
*/

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_sms_provider text DEFAULT 'brevo' CHECK (primary_sms_provider IN ('brevo', 'twilio')),
  sms_provider_status jsonb DEFAULT '{"brevo": {"healthy": true, "last_success_at": null, "last_failure_at": null, "failure_count": 0}, "twilio": {"healthy": true, "last_success_at": null, "last_failure_at": null, "failure_count": 0}}'::jsonb,
  alert_email text,
  alert_phone text,
  last_provider_switch_at timestamptz,
  provider_switch_count integer DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can read platform settings
CREATE POLICY "Super admins can read platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Super admins can update platform settings
CREATE POLICY "Super admins can update platform settings"
  ON platform_settings FOR UPDATE
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

-- Super admins can insert platform settings
CREATE POLICY "Super admins can insert platform settings"
  ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Insert default platform settings if table is empty
INSERT INTO platform_settings (
  primary_sms_provider,
  sms_provider_status,
  settings
)
SELECT
  'brevo',
  '{"brevo": {"healthy": true, "last_success_at": null, "last_failure_at": null, "failure_count": 0}, "twilio": {"healthy": true, "last_success_at": null, "last_failure_at": null, "failure_count": 0}}'::jsonb,
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- Add provider field to communication_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider text;
  END IF;
END $$;

-- Add provider_message_id to communication_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider_message_id text;
  END IF;
END $$;

-- Add failure_attempt_count to communication_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'failure_attempt_count'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN failure_attempt_count integer DEFAULT 0;
  END IF;
END $$;

-- Add provider field to sms_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE sms_logs ADD COLUMN provider text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_logs_provider ON communication_logs(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON communication_logs(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider ON sms_logs(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated ON platform_settings(updated_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_platform_settings_updated_at_trigger ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at_trigger
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE platform_settings IS 'Centralized platform configuration including SMS provider settings and system alerts';
COMMENT ON COLUMN platform_settings.primary_sms_provider IS 'Primary SMS provider to use: brevo or twilio';
COMMENT ON COLUMN platform_settings.sms_provider_status IS 'Health status and metrics for each SMS provider';
COMMENT ON COLUMN platform_settings.alert_email IS 'Email address to receive system alerts when SMS provider switches';
COMMENT ON COLUMN platform_settings.alert_phone IS 'Phone number to receive SMS alerts when provider switches';
COMMENT ON COLUMN communication_logs.provider IS 'SMS/Email provider used: brevo, twilio, sendgrid';
COMMENT ON COLUMN sms_logs.provider IS 'SMS provider used to send message: brevo or twilio';
