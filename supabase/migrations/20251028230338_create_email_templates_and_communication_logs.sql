/*
  # Create Email Templates and Communication Logs Tables

  ## Overview
  This migration adds email template management and comprehensive communication logging
  to track all customer emails and SMS messages sent through the platform.

  ## New Tables

  ### `email_templates`
  - `id` (uuid, primary key) - Unique template identifier
  - `business_id` (uuid, references businesses) - Business that owns the template
  - `name` (text) - Template display name
  - `subject` (text) - Email subject line with variable support
  - `body` (text) - Email body content with variable support
  - `trigger_type` (text) - Category: welcome, promotional, reward, birthday, custom
  - `active` (boolean) - Whether template is enabled
  - `config` (jsonb) - Additional template settings
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ### `communication_logs`
  - `id` (uuid, primary key) - Unique log entry identifier
  - `business_id` (uuid, references businesses) - Business that sent the message
  - `customer_id` (uuid, references customers) - Customer who received the message
  - `type` (text) - Communication type: email or sms
  - `template_id` (uuid) - Template used (nullable for manual messages)
  - `template_name` (text) - Template name snapshot
  - `subject` (text) - Email subject or SMS preview (nullable)
  - `content` (text) - Full message content sent
  - `status` (text) - Delivery status: sent, failed, pending
  - `error_message` (text) - Error details if failed (nullable)
  - `metadata` (jsonb) - Additional tracking data
  - `created_at` (timestamptz) - When message was sent

  ## Security
  - Enable RLS on all tables
  - Businesses can only access their own templates and communication logs
  - Proper policies for select, insert, update operations
  - Restrictive policies ensuring data isolation

  ## Subscription Tier Updates
  - Add email_monthly quota to subscription_tiers features
  - Update businesses table to track email usage
*/

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('welcome', 'promotional', 'reward', 'birthday', 'custom')),
  active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can read own email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Businesses can insert own email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Businesses can update own email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

CREATE POLICY "Businesses can delete own email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (business_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_email_templates_business ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(business_id, active) WHERE active = true;

-- Create communication_logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  customer_id uuid REFERENCES customers NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms')),
  template_id uuid,
  template_name text,
  subject text,
  content text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can read own communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Businesses can insert own communication logs"
  ON communication_logs FOR INSERT
  TO authenticated
  WITH CHECK (business_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_communication_logs_business ON communication_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_customer ON communication_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(business_id, type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created ON communication_logs(created_at DESC);

-- Add trigger for email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add email usage tracking to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'usage_email_monthly'
  ) THEN
    ALTER TABLE businesses ADD COLUMN usage_email_monthly integer DEFAULT 0;
  END IF;
END $$;

-- Update subscription_tiers to include email quotas
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{email_monthly}',
  CASE
    WHEN name = 'Free' THEN '50'::jsonb
    WHEN name = 'Pro' THEN '1000'::jsonb
    WHEN name = 'Agency' THEN '10000'::jsonb
    ELSE '50'::jsonb
  END
)
WHERE NOT features ? 'email_monthly';
