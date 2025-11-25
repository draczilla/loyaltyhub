/*
  # Add Credits Remaining Column to Businesses Table

  ## Summary
  This migration adds the missing `credits_remaining` column to the businesses table and
  sets up proper credit tracking for both email and SMS communications.

  ## Changes Made

  ### 1. Add credits_remaining Column
  - Add `credits_remaining` integer column to businesses table
  - Default value based on tier: 50 for Free, 500 for Pro, 5000 for Agency
  - Add constraint to prevent negative credits
  - Add index for performance

  ### 2. Backfill Existing Data
  - Set credits based on tier and verification status
  - Verified Free tier users get 50 credits
  - Verified Pro tier users get 500 credits
  - Verified Agency tier users get 5000 credits
  - Unverified users get 0 credits

  ### 3. Create Unified Credit Deduction Function
  - `deduct_communication_credit`: Handles credit deduction for both email and SMS
  - Atomic operation with proper locking
  - Records transaction in credit_transactions table
  - Returns success/failure status

  ## Important Notes
  - Credits are unified for both email and SMS (1 credit per communication)
  - Existing verified users will receive credits based on their tier
  - Unverified users start with 0 credits
  - Credit transactions are logged for audit trail
*/

-- Step 1: Add credits_remaining column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE businesses ADD COLUMN credits_remaining integer DEFAULT 0 CHECK (credits_remaining >= 0);
    CREATE INDEX IF NOT EXISTS idx_businesses_credits_remaining ON businesses(credits_remaining);
  END IF;
END $$;

-- Step 2: Backfill credits based on tier and verification status
UPDATE businesses b
SET credits_remaining = CASE
  -- Verified users get credits based on their tier
  WHEN b.email_verified = true AND b.phone_verified = true THEN
    CASE
      WHEN st.name = 'Free' THEN 50
      WHEN st.name = 'Pro' THEN 500
      WHEN st.name = 'Agency' THEN 5000
      ELSE 50
    END
  -- Unverified users get 0 credits
  ELSE 0
END
FROM subscription_tiers st
WHERE b.tier_id = st.id
  AND b.credits_remaining = 0;

-- Step 3: Create or replace the unified credit deduction function
CREATE OR REPLACE FUNCTION deduct_communication_credit(
  p_business_id uuid,
  p_amount integer DEFAULT 1,
  p_communication_type text DEFAULT 'email',
  p_reference_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, remaining_credits integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
  v_new_credits integer;
  v_tier_name text;
BEGIN
  -- Lock the business row for update
  SELECT credits_remaining, t.name
  INTO v_current_credits, v_tier_name
  FROM businesses b
  JOIN subscription_tiers t ON b.tier_id = t.id
  WHERE b.id = p_business_id
  FOR UPDATE;

  -- Check if business exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Business not found'::text;
    RETURN;
  END IF;

  -- Check if sufficient credits
  IF v_current_credits < p_amount THEN
    RETURN QUERY SELECT false, v_current_credits, 'Insufficient credits'::text;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_credits := v_current_credits - p_amount;

  UPDATE businesses
  SET credits_remaining = v_new_credits,
      updated_at = now()
  WHERE id = p_business_id;

  -- Log the transaction if credit_transactions table exists
  BEGIN
    INSERT INTO credit_transactions (
      business_id,
      amount,
      transaction_type,
      reason,
      reference_id,
      performed_by,
      created_at
    ) VALUES (
      p_business_id,
      -p_amount,
      'deduction',
      p_communication_type || ' sent',
      p_reference_id,
      NULL,
      now()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist yet, skip logging
      NULL;
  END;

  -- Return success
  RETURN QUERY SELECT true, v_new_credits, NULL::text;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION deduct_communication_credit TO authenticated, service_role;

-- Step 4: Update or create credit_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deduction', 'addition', 'refund', 'adjustment')),
  reason text,
  reference_id uuid,
  performed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_business_id ON credit_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
DROP POLICY IF EXISTS "Businesses can view own transactions" ON credit_transactions;
CREATE POLICY "Businesses can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (business_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all transactions" ON credit_transactions;
CREATE POLICY "Super admins can view all transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE id = auth.uid()
    )
  );