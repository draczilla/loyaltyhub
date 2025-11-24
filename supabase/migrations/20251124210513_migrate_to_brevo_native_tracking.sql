/*
  # Migrate to Brevo Native Tracking

  ## Overview
  Migrates from custom tracking pixel infrastructure to Brevo's native tracking API.
  This simplifies the tracking implementation and leverages Brevo's proven tracking technology.

  ## Changes

  ### 1. communication_logs Table Updates
  - Add `tracking_method` (text) - Indicates how email is tracked ('brevo_native', 'custom_pixel', 'none')
  - Add `brevo_message_uuid` (uuid) - Brevo's internal message UUID for correlation

  ### 2. Migration Notes
  - New emails will use Brevo native tracking exclusively
  - No custom pixel infrastructure needed
  - Brevo handles all tracking via webhooks

  ## Security
  - Webhook endpoint validates message IDs before processing
  - RLS policies remain unchanged
  - No public tracking pixel endpoint needed (Brevo handles this)

  ## Indexes
  - Add index on provider_message_id for faster webhook lookups
  - Add index on tracking_method for filtering queries
*/

-- Add tracking_method column to communication_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'tracking_method'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN tracking_method text DEFAULT 'brevo_native';
  END IF;
END $$;

-- Add brevo_message_uuid column for Brevo's internal tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'brevo_message_uuid'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN brevo_message_uuid uuid;
  END IF;
END $$;

-- Create index for tracking_method filtering
CREATE INDEX IF NOT EXISTS idx_communication_logs_tracking_method
  ON communication_logs(tracking_method)
  WHERE tracking_method IS NOT NULL;

-- Create index for brevo_message_uuid lookups
CREATE INDEX IF NOT EXISTS idx_communication_logs_brevo_message_uuid
  ON communication_logs(brevo_message_uuid)
  WHERE brevo_message_uuid IS NOT NULL;

-- Update existing provider_message_id index to be more efficient
DROP INDEX IF EXISTS idx_communication_logs_provider_message_id;
CREATE INDEX idx_communication_logs_provider_message_id
  ON communication_logs(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN communication_logs.tracking_method IS 'Method used for email tracking: brevo_native (Brevo API), custom_pixel (legacy), none';
COMMENT ON COLUMN communication_logs.brevo_message_uuid IS 'Brevo internal message UUID for advanced tracking correlation';

-- Set default for all existing Brevo emails
UPDATE communication_logs
SET tracking_method = 'brevo_native'
WHERE provider_message_id IS NOT NULL
  AND provider = 'brevo'
  AND tracking_method IS NULL;

-- Mark emails without tracking
UPDATE communication_logs
SET tracking_method = 'none'
WHERE provider_message_id IS NULL
  AND tracking_method IS NULL;
