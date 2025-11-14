/*
  # Fix Transactions Table RLS for Tenant Member Access

  ## Problem
  The transactions table still uses old "FOR ALL" RLS policies that only check
  `auth.uid() = business_id`. This prevents:
  1. Tenant members (team members) from reading transaction data
  2. Dashboard from loading transaction counts for team members
  3. Consistent access patterns across all business resources

  ## Solution
  Update the transactions table RLS policies to use the `user_has_business_access()`
  helper function, matching the pattern established for customers, programs, and
  other resource tables in migration 20251112111845.

  ## Changes
  1. Drop old "FOR ALL" policies that are too restrictive
  2. Create specific SELECT, INSERT, UPDATE, DELETE policies
  3. Use user_has_business_access() helper for consistent access control
  4. Maintain super admin access policies

  ## Security
  - Restrictive by default: only authenticated users
  - Checks both direct ownership and tenant membership
  - Maintains data isolation between tenants
  - Preserves super admin oversight capabilities
*/

-- =====================================================
-- TRANSACTIONS TABLE - Update RLS Policies
-- =====================================================

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Businesses can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Super admins can read all transactions" ON transactions;

-- Create specific policies using the helper function

CREATE POLICY "Businesses can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- Maintain super admin access
CREATE POLICY "Super admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Add comment explaining the policies
COMMENT ON TABLE transactions IS
  'Loyalty transaction records. Access controlled via user_has_business_access() to support both direct business owners and tenant members.';
