/*
  # Add Missing Communication Tracking Columns

  This migration adds missing columns needed for email tracking and communication management.

  ## Changes
  
  ### communication_logs table
  - Add `opened_at` column for tracking when emails are first opened
  - Add `open_count` column for tracking total number of opens
  - Add `tracking_token` column for unique tracking identifiers
  - Add `provider_message_id` column for external provider message IDs
  - Add `provider` column for tracking which service sent the message (brevo/vonage)
  - Add `is_test_email` column for distinguishing test emails

  ### businesses table
  - Add `email_tracking_enabled` column for per-business tracking preferences

  ### integrations table  
  - Add `email_config` column for storing email provider configurations

  ## Notes
  - Uses IF NOT EXISTS checks to avoid errors if columns already exist
  - Sets sensible defaults for all new columns
  - Maintains data integrity for existing records
*/

-- Add columns to communication_logs if they don't exist
DO $$
BEGIN
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
    WHERE table_name = 'communication_logs' AND column_name = 'tracking_token'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN tracking_token uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider_message_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN provider text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'is_test_email'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN is_test_email boolean DEFAULT false;
  END IF;
END $$;

-- Add columns to businesses if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'email_tracking_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN email_tracking_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add columns to integrations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integrations' AND column_name = 'email_config'
  ) THEN
    ALTER TABLE integrations ADD COLUMN email_config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_communication_logs_tracking_token 
  ON communication_logs(tracking_token) 
  WHERE tracking_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_logs_opened_at 
  ON communication_logs(opened_at) 
  WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_logs_test_emails 
  ON communication_logs(business_id, is_test_email) 
  WHERE is_test_email = true;