/*
  # Add Email Tracking Infrastructure

  ## Overview
  This migration adds comprehensive email tracking infrastructure including tracking pixels
  for open rate monitoring, SendGrid integration support, and enhanced communication logging.

  ## Changes

  ### 1. communication_logs Table Updates
  - `tracking_token` (uuid) - Unique token for tracking email opens via pixel
  - `opened_at` (timestamptz) - Timestamp of first email open
  - `open_count` (integer) - Total number of times email was opened
  - `provider` (text) - Email provider used (sendgrid, etc.)
  - `provider_message_id` (text) - External provider's message ID for tracking

  ### 2. email_opens Table (New)
  - `id` (uuid, primary key) - Unique open event identifier
  - `communication_log_id` (uuid, references communication_logs) - Email that was opened
  - `opened_at` (timestamptz) - When the email was opened
  - `ip_address` (inet) - IP address of opener (nullable for privacy)
  - `user_agent` (text) - Browser/email client user agent (nullable)
  - `metadata` (jsonb) - Additional tracking data

  ### 3. integrations Table Updates
  - Add support for SendGrid configuration per business
  - Add `email_config` jsonb column for email provider settings
  - Store API keys, from addresses, and verification status

  ## Security
  - Enable RLS on all new tables
  - Businesses can only access their own tracking data
  - Public access to tracking pixel endpoint (no auth required)
  - Proper policies for select, insert operations
  - Track email opens without exposing sensitive customer data

  ## Indexes
  - Add indexes for efficient tracking token lookups
  - Add indexes for open rate analytics queries
  - Add indexes for provider message ID lookups
*/

-- Add tracking fields to communication_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'tracking_token'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN tracking_token uuid DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN opened_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'open_count'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN open_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider_message_id text;
  END IF;
END $$;

-- Create index for tracking token lookups (used by tracking pixel)
CREATE INDEX IF NOT EXISTS idx_communication_logs_tracking_token
  ON communication_logs(tracking_token)
  WHERE tracking_token IS NOT NULL;

-- Create index for provider message ID lookups (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_communication_logs_provider_message_id
  ON communication_logs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Create email_opens table for detailed open tracking
CREATE TABLE IF NOT EXISTS email_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_log_id uuid REFERENCES communication_logs NOT NULL,
  opened_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;

-- Allow public access to insert email opens (tracking pixel endpoint needs this)
CREATE POLICY "Allow public to insert email opens"
  ON email_opens FOR INSERT
  TO anon
  WITH CHECK (true);

-- Businesses can read email opens for their own emails
CREATE POLICY "Businesses can read own email opens"
  ON email_opens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communication_logs
      WHERE communication_logs.id = email_opens.communication_log_id
      AND communication_logs.business_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_opens_communication_log
  ON email_opens(communication_log_id);

CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at
  ON email_opens(opened_at DESC);

-- Add email_config to integrations table for SendGrid configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations' AND column_name = 'email_config'
  ) THEN
    ALTER TABLE integrations ADD COLUMN email_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add email_tracking_enabled to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_tracking_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_tracking_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Create function to update communication_logs when email is opened
CREATE OR REPLACE FUNCTION update_email_open_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communication_logs
  SET
    opened_at = COALESCE(opened_at, NEW.opened_at),
    open_count = open_count + 1
  WHERE id = NEW.communication_log_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update communication_logs on email open
DROP TRIGGER IF EXISTS trigger_update_email_open_stats ON email_opens;
CREATE TRIGGER trigger_update_email_open_stats
  AFTER INSERT ON email_opens
  FOR EACH ROW
  EXECUTE FUNCTION update_email_open_stats();

-- Add comments for documentation
COMMENT ON COLUMN communication_logs.tracking_token IS 'Unique token used in tracking pixel URL to identify email opens';
COMMENT ON COLUMN communication_logs.opened_at IS 'Timestamp of first email open';
COMMENT ON COLUMN communication_logs.open_count IS 'Total number of times email was opened';
COMMENT ON COLUMN communication_logs.provider IS 'Email service provider used (e.g., sendgrid)';
COMMENT ON COLUMN communication_logs.provider_message_id IS 'External provider message ID for tracking';
COMMENT ON TABLE email_opens IS 'Detailed tracking of individual email open events for analytics';
COMMENT ON COLUMN integrations.email_config IS 'Business-specific email provider configuration (SendGrid API keys, from addresses, etc.)';
COMMENT ON COLUMN businesses.email_tracking_enabled IS 'Whether email open tracking is enabled for this business';
