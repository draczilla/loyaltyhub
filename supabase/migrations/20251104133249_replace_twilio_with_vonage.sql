/*
  # Replace Twilio with Vonage SMS Provider

  ## Overview
  This migration completely replaces Twilio SMS integration with Vonage SMS API.
  All existing Twilio integrations will be automatically migrated to Vonage.

  ## Changes
  
  1. **integrations table updates**
    - Update CHECK constraint to replace 'twilio' with 'vonage' as valid service type
    - Migrate all existing integrations with service='twilio' to service='vonage'
    - Preserve all other integration settings and credentials structure
  
  2. **sms_logs table updates**
    - Rename column 'twilio_sid' to 'provider_message_id' for provider-agnostic tracking
    - Maintain all existing log data with the renamed column
    - Update indexes and constraints to use new column name
  
  ## Data Migration
  - All existing Twilio integrations will be converted to Vonage
  - SMS logs will retain their message tracking IDs in the renamed column
  - No data loss during migration
  
  ## Important Notes
  - Businesses using Twilio will need to reconfigure with Vonage credentials
  - Platform-level credentials should be updated to Vonage API keys
  - Existing SMS logs remain accessible with the provider_message_id field
*/

-- Step 1: Rename twilio_sid column to provider_message_id in sms_logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_logs' AND column_name = 'twilio_sid'
  ) THEN
    ALTER TABLE sms_logs RENAME COLUMN twilio_sid TO provider_message_id;
  END IF;
END $$;

-- Step 2: Update all existing Twilio integrations to Vonage
UPDATE integrations
SET service = 'vonage'
WHERE service = 'twilio';

-- Step 3: Drop the old CHECK constraint on integrations table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integrations_service_check'
  ) THEN
    ALTER TABLE integrations DROP CONSTRAINT integrations_service_check;
  END IF;
END $$;

-- Step 4: Add new CHECK constraint with 'vonage' instead of 'twilio'
ALTER TABLE integrations 
ADD CONSTRAINT integrations_service_check 
CHECK (service IN ('mailchimp', 'vonage'));

-- Step 5: Create index on provider_message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_message_id ON sms_logs(provider_message_id);

-- Step 6: Add comment to document the change
COMMENT ON COLUMN sms_logs.provider_message_id IS 'Message ID from SMS provider (Vonage message-id)';
COMMENT ON TABLE integrations IS 'Third-party service integrations (Mailchimp, Vonage SMS)';
