/*
  # Create SMS Templates Table

  ## Overview
  This migration adds an SMS templates table for storing transactional SMS templates
  that can be triggered automatically based on customer events.

  ## New Tables

  ### `sms_templates`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `name` (text) - Template name
  - `trigger_type` (text) - welcome, reward_earned, points_milestone, birthday, custom
  - `message_template` (text) - SMS message with placeholder variables
  - `active` (boolean) - Whether template is enabled
  - `config` (jsonb) - Additional configuration (delays, conditions, etc.)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on sms_templates table
  - Businesses can only manage their own templates
  - Super admins can read all templates
*/

-- Create SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('welcome', 'reward_earned', 'points_milestone', 'birthday', 'custom')),
  message_template text NOT NULL,
  active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own SMS templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE POLICY "Super admins can read all SMS templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = auth.uid()
      AND businesses.is_super_admin = true
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_templates_business ON sms_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_trigger_type ON sms_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON sms_templates(active);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON sms_templates;
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
