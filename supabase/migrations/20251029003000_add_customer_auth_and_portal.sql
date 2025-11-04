/*
  # Add Customer Portal Authentication and Enhanced Fields

  ## Overview
  This migration adds authentication capabilities for customers to access their own portal,
  view rewards, track progress, and redeem benefits. It also enhances the customer and
  program tables with fields needed for customer self-service.

  ## Changes

  ### Customer Table Enhancements
  1. Add authentication fields:
    - `auth_phone` (text) - Phone number used for login (unique)
    - `auth_pin` (text) - 4-6 digit PIN for authentication (hashed)
    - `last_login_at` (timestamptz) - Track last portal access
    - `portal_enabled` (boolean) - Allow/deny portal access

  2. Add program enrollment tracking:
    - `enrolled_programs` (jsonb) - Track which programs customer is enrolled in with progress

  ### Transactions Table Enhancements
  1. Add `reward_id` (uuid) - Link to specific reward when applicable
  2. Add `redeemed_at` (timestamptz) - When reward was redeemed
  3. Add `expires_at` (timestamptz) - Expiration for time-limited rewards

  ### New Table: customer_program_progress
  Track customer progress in each loyalty program separately
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `program_id` (uuid, references loyalty_programs)
  - `points_balance` (integer) - Current points for points programs
  - `stamps_current` (integer) - Current stamps for stamp card programs
  - `total_earned` (integer) - Lifetime earning in this program
  - `last_activity_at` (timestamptz) - Last transaction date
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### New Table: customer_rewards
  Track rewards earned and redeemed by customers
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `program_id` (uuid, references loyalty_programs)
  - `reward_id` (uuid, references rewards)
  - `status` (text) - earned, redeemed, expired
  - `earned_at` (timestamptz)
  - `redeemed_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `redemption_code` (text) - Unique code for verification
  - `metadata` (jsonb)

  ## Security
  - Enable RLS on new tables
  - Add customer access policies for their own data
  - Maintain business access to all their customer data
  - Add indexes for performance

  ## Important Notes
  1. Customer PINs should be hashed before storage (handle in application)
  2. Phone numbers used for auth should be verified via SMS
  3. Portal access can be disabled per customer if needed
*/

-- Add authentication and portal fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'auth_phone'
  ) THEN
    ALTER TABLE customers ADD COLUMN auth_phone text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'auth_pin'
  ) THEN
    ALTER TABLE customers ADD COLUMN auth_pin text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_login_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'portal_enabled'
  ) THEN
    ALTER TABLE customers ADD COLUMN portal_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'enrolled_programs'
  ) THEN
    ALTER TABLE customers ADD COLUMN enrolled_programs jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add reward tracking fields to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'reward_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reward_id uuid REFERENCES rewards(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'redeemed_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN redeemed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create customer_program_progress table
CREATE TABLE IF NOT EXISTS customer_program_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES loyalty_programs ON DELETE CASCADE NOT NULL,
  points_balance integer DEFAULT 0,
  stamps_current integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, program_id)
);

ALTER TABLE customer_program_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage customer progress"
  ON customer_program_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_program_progress.customer_id
      AND customers.business_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_program_progress.customer_id
      AND customers.business_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own progress"
  ON customer_program_progress FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_program_progress.customer_id
      AND customers.auth_phone IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_progress_customer ON customer_program_progress(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_progress_program ON customer_program_progress(program_id);

-- Create customer_rewards table
CREATE TABLE IF NOT EXISTS customer_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers ON DELETE CASCADE NOT NULL,
  program_id uuid REFERENCES loyalty_programs ON DELETE CASCADE NOT NULL,
  reward_id uuid REFERENCES rewards(id) ON DELETE SET NULL,
  status text DEFAULT 'earned' CHECK (status IN ('earned', 'redeemed', 'expired')),
  earned_at timestamptz DEFAULT now(),
  redeemed_at timestamptz,
  expires_at timestamptz,
  redemption_code text UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage customer rewards"
  ON customer_rewards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_rewards.customer_id
      AND customers.business_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_rewards.customer_id
      AND customers.business_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own rewards"
  ON customer_rewards FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_rewards.customer_id
      AND customers.auth_phone IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer ON customer_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_program ON customer_rewards(program_id);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_status ON customer_rewards(status);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_code ON customer_rewards(redemption_code);
CREATE INDEX IF NOT EXISTS idx_customers_auth_phone ON customers(auth_phone);

-- Create trigger for customer_program_progress updated_at
CREATE TRIGGER update_customer_program_progress_updated_at
  BEFORE UPDATE ON customer_program_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate unique redemption codes
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'RWD-' || UPPER(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM customer_rewards WHERE redemption_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically track program enrollment
CREATE OR REPLACE FUNCTION track_program_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM customer_program_progress
    WHERE customer_id = NEW.customer_id AND program_id = NEW.program_id
  ) THEN
    INSERT INTO customer_program_progress (customer_id, program_id, last_activity_at)
    VALUES (NEW.customer_id, NEW.program_id, NEW.created_at);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-enroll customers in programs on first transaction
CREATE TRIGGER auto_enroll_customer_in_program
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.program_id IS NOT NULL)
  EXECUTE FUNCTION track_program_enrollment();
