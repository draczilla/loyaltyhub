/*
  # Optimize RLS Policies - Auth Function Calls

  1. Performance Improvements
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    - Prevents re-evaluation of auth functions for each row
    - Significant performance improvement at scale

  2. Tables Updated
    - businesses (4 policies)
    - transactions (1 policy)
    - super_admins (1 policy)
    - credit_transactions (2 policies)
    - tenants (1 policy)
    - tenant_invitations (1 policy)
    - brevo_sync_logs (2 policies)
    - referral_codes (2 policies)
    - referrals (2 policies)
    - referral_badges (2 policies)

  3. Notes
    - Drops and recreates policies with optimized versions
    - Maintains exact same security logic
    - See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
*/

-- ============================================
-- BUSINESSES TABLE
-- ============================================

DROP POLICY IF EXISTS "Businesses can read own data" ON businesses;
CREATE POLICY "Businesses can read own data"
  ON businesses FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Businesses can update own data" ON businesses;
CREATE POLICY "Businesses can update own data"
  ON businesses FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Tenant members can read business data" ON businesses;
CREATE POLICY "Tenant members can read business data"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can create own business" ON businesses;
CREATE POLICY "Users can create own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Super admins can read all transactions" ON transactions;
CREATE POLICY "Super admins can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================
-- SUPER_ADMINS TABLE
-- ============================================

DROP POLICY IF EXISTS "Super admins can read own record" ON super_admins;
CREATE POLICY "Super admins can read own record"
  ON super_admins FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- ============================================
-- CREDIT_TRANSACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Businesses can view own transactions" ON credit_transactions;
CREATE POLICY "Businesses can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (business_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all transactions" ON credit_transactions;
CREATE POLICY "Super admins can view all transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================
-- TENANTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible tenants" ON tenants;
CREATE POLICY "Users can view accessible tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    admin_user_id = (SELECT auth.uid())
    OR id IN (
      SELECT tenant_id FROM tenant_members 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

-- ============================================
-- TENANT_INVITATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own invitations" ON tenant_invitations;
CREATE POLICY "Users can view own invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_members 
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

-- ============================================
-- BREVO_SYNC_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Business members can view sync logs" ON brevo_sync_logs;
CREATE POLICY "Business members can view sync logs"
  ON brevo_sync_logs FOR SELECT
  TO authenticated
  USING (business_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all sync logs" ON brevo_sync_logs;
CREATE POLICY "Super admins can view all sync logs"
  ON brevo_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================
-- REFERRAL_CODES TABLE
-- ============================================

DROP POLICY IF EXISTS "Businesses can view own referral code" ON referral_codes;
CREATE POLICY "Businesses can view own referral code"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (business_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all referral codes" ON referral_codes;
CREATE POLICY "Super admins can view all referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================
-- REFERRALS TABLE
-- ============================================

DROP POLICY IF EXISTS "Businesses can view own referrals" ON referrals;
CREATE POLICY "Businesses can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_business_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all referrals" ON referrals;
CREATE POLICY "Super admins can view all referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================
-- REFERRAL_BADGES TABLE
-- ============================================

DROP POLICY IF EXISTS "Businesses can view own badges" ON referral_badges;
CREATE POLICY "Businesses can view own badges"
  ON referral_badges FOR SELECT
  TO authenticated
  USING (business_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all badges" ON referral_badges;
CREATE POLICY "Super admins can view all badges"
  ON referral_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE id = (SELECT auth.uid())
    )
  );

-- Add comment
COMMENT ON POLICY "Businesses can read own data" ON businesses IS 'Optimized with SELECT auth.uid() for performance';
