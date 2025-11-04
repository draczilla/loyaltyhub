/*
  # Add Stripe Integration Support

  ## Overview
  This migration adds Stripe payment integration support to enable subscription billing and payment management for the loyalty platform.

  ## New Tables
  
  ### `stripe_customers`
  Links businesses to their Stripe customer records
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, foreign key) - References businesses table
  - `stripe_customer_id` (text, unique) - Stripe customer ID
  - `stripe_subscription_id` (text, nullable) - Current Stripe subscription ID
  - `stripe_price_id` (text, nullable) - Current Stripe price ID
  - `payment_method_status` (text) - Status of payment method (active, missing, failed)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### `stripe_webhook_events`
  Tracks processed Stripe webhook events to prevent duplicate processing
  - `id` (uuid, primary key) - Unique identifier
  - `stripe_event_id` (text, unique) - Stripe event ID
  - `event_type` (text) - Type of webhook event
  - `processed` (boolean) - Whether event has been processed
  - `payload` (jsonb) - Full event payload for debugging
  - `created_at` (timestamptz) - Record creation timestamp

  ### `subscription_history`
  Tracks subscription changes and payment events for audit trail
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, foreign key) - References businesses table
  - `event_type` (text) - Type of event (subscription_created, payment_succeeded, etc.)
  - `tier_id` (uuid, nullable, foreign key) - References subscription_tiers table
  - `stripe_subscription_id` (text, nullable) - Stripe subscription ID
  - `stripe_invoice_id` (text, nullable) - Stripe invoice ID
  - `amount` (numeric, nullable) - Payment amount in dollars
  - `metadata` (jsonb) - Additional event data
  - `created_at` (timestamptz) - Event timestamp

  ## Modified Tables
  
  ### `businesses`
  Added Stripe-related fields:
  - `stripe_price_id` (text, nullable) - Current Stripe price ID for the subscription
  - `subscription_period_end` (timestamptz, nullable) - When current subscription period ends
  - `trial_ends_at` (timestamptz, nullable) - When trial period ends

  ### `subscription_tiers`
  Added Stripe product mapping:
  - `stripe_price_id` (text, nullable) - Stripe price ID for this tier

  ## Security
  - Enable RLS on all new tables
  - Super admins can read all records
  - Businesses can only read their own stripe_customers records
  - webhook_events table is only accessible by service role
  - subscription_history is read-only for businesses

  ## Important Notes
  1. All fields use IF NOT EXISTS to prevent errors if already present
  2. Payment amounts are stored in dollars for easy display
  3. Webhook events are stored for idempotency and debugging
  4. Subscription history provides audit trail for compliance
*/

-- Add Stripe-related fields to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN stripe_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE businesses ADD COLUMN subscription_period_end timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE businesses ADD COLUMN trial_ends_at timestamptz;
  END IF;
END $$;

-- Add Stripe price mapping to subscription_tiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tiers' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE subscription_tiers ADD COLUMN stripe_price_id text;
  END IF;
END $$;

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  stripe_subscription_id text,
  stripe_price_id text,
  payment_method_status text DEFAULT 'missing' CHECK (payment_method_status IN ('active', 'missing', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_customers_business_id ON stripe_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_subscription_id ON stripe_customers(stripe_subscription_id);

-- Create stripe_webhook_events table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed boolean DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON stripe_webhook_events(processed);

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  tier_id uuid REFERENCES subscription_tiers(id),
  stripe_subscription_id text,
  stripe_invoice_id text,
  amount numeric(10, 2),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_business_id ON subscription_history(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
CREATE POLICY "Super admins can read all stripe customer records"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = auth.uid()
      AND businesses.is_super_admin = true
    )
  );

CREATE POLICY "Businesses can read own stripe customer record"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Service role can manage stripe customers"
  ON stripe_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for stripe_webhook_events
CREATE POLICY "Only service role can access webhook events"
  ON stripe_webhook_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for subscription_history
CREATE POLICY "Super admins can read all subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = auth.uid()
      AND businesses.is_super_admin = true
    )
  );

CREATE POLICY "Businesses can read own subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

CREATE POLICY "Service role can insert subscription history"
  ON subscription_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stripe_customers
DROP TRIGGER IF EXISTS trigger_update_stripe_customers_updated_at ON stripe_customers;
CREATE TRIGGER trigger_update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_customers_updated_at();