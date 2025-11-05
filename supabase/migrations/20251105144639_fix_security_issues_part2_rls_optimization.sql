/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  ## Changes Made
  
  ### 1. Optimize RLS Policies - Auth Function Initialization
  All policies updated to use (select auth.uid()) pattern instead of auth.uid()
  This prevents re-evaluation of auth functions for each row, significantly improving
  query performance at scale.
  
  Tables optimized:
  - customer_program_progress
  - customer_rewards
  - verification_attempts
  - tenants
  - tenant_invitations
  - tenant_deletions
  - tenant_members
  - businesses
  - platform_settings
  
  ### 2. Important Notes
  - All policies maintain exact same security checks
  - Only performance optimization applied
  - Wrapped auth.uid() calls in SELECT subqueries
  - Policies are dropped and recreated with optimized versions
  
  ## Performance Impact
  - Reduces CPU usage on large table scans
  - Improves query response times
  - Scales better with increasing data volumes
*/

-- =====================================================
-- CUSTOMER_PROGRAM_PROGRESS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage customer progress" ON public.customer_program_progress;
DROP POLICY IF EXISTS "Customers can view own progress" ON public.customer_program_progress;

CREATE POLICY "Businesses can manage customer progress"
  ON public.customer_program_progress
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_program_progress.customer_id
      AND c.business_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_program_progress.customer_id
      AND c.business_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can view own progress"
  ON public.customer_program_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_program_progress.customer_id
      AND c.auth_phone IS NOT NULL
    )
  );

-- =====================================================
-- CUSTOMER_REWARDS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage customer rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Customers can view own rewards" ON public.customer_rewards;

CREATE POLICY "Businesses can manage customer rewards"
  ON public.customer_rewards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_rewards.customer_id
      AND c.business_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_rewards.customer_id
      AND c.business_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can view own rewards"
  ON public.customer_rewards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_rewards.customer_id
      AND c.auth_phone IS NOT NULL
    )
  );

-- =====================================================
-- VERIFICATION_ATTEMPTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read all verification attempts" ON public.verification_attempts;
DROP POLICY IF EXISTS "Businesses can read own verification attempts" ON public.verification_attempts;

CREATE POLICY "Super admins can read all verification attempts"
  ON public.verification_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Businesses can read own verification attempts"
  ON public.verification_attempts
  FOR SELECT
  TO authenticated
  USING (business_id = (select auth.uid()));

-- =====================================================
-- TENANTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can update own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can create own tenant" ON public.tenants;

CREATE POLICY "Users can view own tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    admin_user_id = (select auth.uid())
    OR id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = (select auth.uid()) AND status = 'active'
    )
  );

CREATE POLICY "Tenant admins can update own tenant"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (admin_user_id = (select auth.uid()))
  WITH CHECK (admin_user_id = (select auth.uid()));

CREATE POLICY "Users can create own tenant"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = (select auth.uid()));

-- =====================================================
-- TENANT_INVITATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Tenant admins can view invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant admins can create invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant admins can update invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant admins can delete invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Users can view invitations for own tenant" ON public.tenant_invitations;

CREATE POLICY "Tenant admins can view invitations"
  ON public.tenant_invitations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
    OR email IN (
      SELECT email FROM auth.users WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Tenant admins can create invitations"
  ON public.tenant_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
    AND can_invite_member(tenant_id)
  );

CREATE POLICY "Tenant admins can update invitations"
  ON public.tenant_invitations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Tenant admins can delete invitations"
  ON public.tenant_invitations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  );

-- =====================================================
-- TENANT_DELETIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view deletion logs" ON public.tenant_deletions;

CREATE POLICY "Super admins can view deletion logs"
  ON public.tenant_deletions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

-- =====================================================
-- TENANT_MEMBERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Tenant admins and members can view members" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can view members of own tenant" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can insert members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can update members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can delete members" ON public.tenant_members;

CREATE POLICY "Tenant admins and members can view members"
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = (select auth.uid()) AND status = 'active'
    )
    OR tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Tenant admins can insert members"
  ON public.tenant_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Tenant admins can update members"
  ON public.tenant_members
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Tenant admins can delete members"
  ON public.tenant_members
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (select auth.uid())
    )
    AND user_id != (select auth.uid())
  );

-- =====================================================
-- BUSINESSES TABLE - Additional Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can create own business" ON public.businesses;

CREATE POLICY "Users can create own business"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- =====================================================
-- PLATFORM_SETTINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Super admins can update platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Super admins can insert platform settings" ON public.platform_settings;

CREATE POLICY "Super admins can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = (select auth.uid())
    )
  );
