/*
  # Core Loyalty Platform Schema

  ## Overview
  This migration creates the foundational database schema for a multi-tenant loyalty platform
  serving small businesses with subscription tiers (Free, Pro, Agency).

  ## New Tables
  
  ### `subscription_tiers`
  - `id` (uuid, primary key)
  - `name` (text) - Free, Pro, or Agency
  - `max_customers` (integer) - Maximum customers allowed
  - `max_programs` (integer) - Maximum active loyalty programs
  - `max_sms_monthly` (integer) - SMS quota per month
  - `price_monthly` (numeric) - Monthly subscription price
  - `features` (jsonb) - Feature flags and limits
  
  ### `businesses`
  - `id` (uuid, primary key, references auth.users)
  - `company_name` (text)
  - `email` (text, unique)
  - `logo_url` (text)
  - `primary_color` (text) - Brand color (default orange for platform)
  - `tier_id` (uuid, references subscription_tiers)
  - `subscription_status` (text) - active, trial, expired, cancelled
  - `usage_customers` (integer) - Current customer count
  - `usage_sms_monthly` (integer) - SMS sent this month
  - `usage_reset_date` (timestamptz) - When monthly counters reset
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `customers`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `unique_customer_id` (text, unique) - Human-readable unique ID
  - `email` (text)
  - `phone` (text)
  - `first_name` (text)
  - `last_name` (text)
  - `birthday` (date)
  - `custom_fields` (jsonb) - Additional form fields
  - `opted_in_sms` (boolean)
  - `opted_in_email` (boolean)
  - `total_points` (integer)
  - `lifetime_points_earned` (integer)
  - `total_visits` (integer)
  - `last_visit_date` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `loyalty_programs`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `name` (text)
  - `type` (text) - points, stamp_card, rebate_code, discount, free_item
  - `status` (text) - active, paused, archived
  - `config` (jsonb) - Program-specific configuration
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `rewards`
  - `id` (uuid, primary key)
  - `program_id` (uuid, references loyalty_programs)
  - `business_id` (uuid, references businesses)
  - `name` (text)
  - `description` (text)
  - `type` (text) - point_redemption, stamp_completion, rebate, discount, free_item
  - `cost_points` (integer) - Points required (if applicable)
  - `cost_stamps` (integer) - Stamps required (if applicable)
  - `config` (jsonb) - Reward-specific settings
  - `active` (boolean)
  - `created_at` (timestamptz)
  
  ### `transactions`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `customer_id` (uuid, references customers)
  - `program_id` (uuid, references loyalty_programs)
  - `type` (text) - points_earned, points_redeemed, stamp_added, reward_claimed, manual_adjustment
  - `points_change` (integer)
  - `stamps_change` (integer)
  - `description` (text)
  - `metadata` (jsonb)
  - `created_by` (uuid) - Business user who created transaction
  - `created_at` (timestamptz)
  
  ### `qr_codes`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `code` (text, unique) - Unique QR code identifier
  - `location_name` (text) - Store location name
  - `scan_count` (integer)
  - `signup_count` (integer)
  - `active` (boolean)
  - `created_at` (timestamptz)
  
  ### `onboarding_forms`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `form_config` (jsonb) - Field definitions and settings
  - `welcome_message` (text)
  - `thank_you_message` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `campaigns`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `name` (text)
  - `type` (text) - sms, email, both
  - `status` (text) - draft, scheduled, sent, completed
  - `message_template` (text)
  - `scheduled_for` (timestamptz)
  - `sent_at` (timestamptz)
  - `recipient_count` (integer)
  - `opened_count` (integer)
  - `clicked_count` (integer)
  - `config` (jsonb) - Campaign settings
  - `created_at` (timestamptz)
  
  ### `integrations`
  - `id` (uuid, primary key)
  - `business_id` (uuid, references businesses)
  - `service` (text) - mailchimp, twilio, etc.
  - `credentials` (jsonb) - Encrypted API keys
  - `settings` (jsonb) - Integration configuration
  - `active` (boolean)
  - `last_sync_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Businesses can only access their own data
  - Customers can only access their own profile and loyalty data
  - Proper policies for multi-tenant isolation
*/

-- Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  max_customers integer NOT NULL,
  max_programs integer NOT NULL,
  max_sms_monthly integer NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, max_customers, max_programs, max_sms_monthly, price_monthly, features) VALUES
  ('Free', 50, 1, 50, 0, '{"mailchimp": false, "advanced_analytics": false, "white_label": false, "custom_domain": false}'::jsonb),
  ('Pro', 500, 3, 500, 49, '{"mailchimp": true, "advanced_analytics": true, "white_label": false, "custom_domain": false}'::jsonb),
  ('Agency', -1, -1, 5000, 149, '{"mailchimp": true, "advanced_analytics": true, "white_label": true, "custom_domain": true, "priority_support": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_name text NOT NULL,
  email text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#ff6b35',
  tier_id uuid REFERENCES subscription_tiers NOT NULL,
  subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled')),
  usage_customers integer DEFAULT 0,
  usage_sms_monthly integer DEFAULT 0,
  usage_reset_date timestamptz DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can read own data"
  ON businesses FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Businesses can update own data"
  ON businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  unique_customer_id text UNIQUE NOT NULL,
  email text,
  phone text,
  first_name text,
  last_name text,
  birthday date,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  opted_in_sms boolean DEFAULT true,
  opted_in_email boolean DEFAULT true,
  total_points integer DEFAULT 0,
  lifetime_points_earned integer DEFAULT 0,
  total_visits integer DEFAULT 0,
  last_visit_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can read own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE POLICY "Businesses can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE POLICY "Businesses can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

-- Create index for unique customer ID lookups
CREATE INDEX IF NOT EXISTS idx_customers_unique_id ON customers(unique_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);

-- Create loyalty programs table
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('points', 'stamp_card', 'rebate_code', 'discount', 'free_item')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own programs"
  ON loyalty_programs FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_programs_business ON loyalty_programs(business_id);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES loyalty_programs ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('point_redemption', 'stamp_completion', 'rebate', 'discount', 'free_item')),
  cost_points integer DEFAULT 0,
  cost_stamps integer DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own rewards"
  ON rewards FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  customer_id uuid REFERENCES customers NOT NULL,
  program_id uuid REFERENCES loyalty_programs,
  type text NOT NULL CHECK (type IN ('points_earned', 'points_redeemed', 'stamp_added', 'reward_claimed', 'manual_adjustment')),
  points_change integer DEFAULT 0,
  stamps_change integer DEFAULT 0,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business ON transactions(business_id);

-- Create QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  code text UNIQUE NOT NULL,
  location_name text,
  scan_count integer DEFAULT 0,
  signup_count integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own QR codes"
  ON qr_codes FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_qr_codes_business ON qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);

-- Create onboarding forms table
CREATE TABLE IF NOT EXISTS onboarding_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  form_config jsonb DEFAULT '[]'::jsonb,
  welcome_message text DEFAULT 'Welcome! Join our loyalty program.',
  thank_you_message text DEFAULT 'Thank you for joining!',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own forms"
  ON onboarding_forms FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('sms', 'email', 'both')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'completed')),
  message_template text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses NOT NULL,
  service text NOT NULL CHECK (service IN ('mailchimp', 'twilio')),
  credentials jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT false,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE auth.uid() = id));

-- Create function to generate unique customer IDs
CREATE OR REPLACE FUNCTION generate_unique_customer_id(business_prefix text DEFAULT 'CUS')
RETURNS text AS $$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    new_id := business_prefix || '-' || LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM customers WHERE unique_customer_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_forms_updated_at BEFORE UPDATE ON onboarding_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
