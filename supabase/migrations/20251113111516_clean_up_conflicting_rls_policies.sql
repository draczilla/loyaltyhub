/*
  # Clean Up Conflicting RLS Policies

  ## Problem
  Some tables have old RLS policies that conflict with the new tenant member
  access policies. These old policies use patterns like:
  - "Businesses can manage own X" (FOR ALL)
  - (SELECT auth.uid()) = business_id
  
  These policies are more restrictive and can block tenant member access
  even when newer policies would allow it.

  ## Solution
  Drop all old conflicting "FOR ALL" or "manage" policies that were created
  before the tenant member access update. Keep only the specific SELECT,
  INSERT, UPDATE, DELETE policies that use user_has_business_access().

  ## Tables Affected
  - loyalty_programs
  - onboarding_forms (if exists)
  
  ## Important
  Super admin policies are preserved - only business access policies are updated.
*/

-- =====================================================
-- LOYALTY_PROGRAMS TABLE - Remove old conflicting policy
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Businesses can manage own loyalty programs" ON loyalty_programs;

-- Ensure all specific policies exist with correct definitions
DROP POLICY IF EXISTS "Businesses can read own loyalty programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Businesses can insert own loyalty programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Businesses can update own loyalty programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Businesses can delete own loyalty programs" ON loyalty_programs;

CREATE POLICY "Businesses can read own loyalty programs"
  ON loyalty_programs
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own loyalty programs"
  ON loyalty_programs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own loyalty programs"
  ON loyalty_programs
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own loyalty programs"
  ON loyalty_programs
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- ONBOARDING_FORMS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_forms') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Businesses can manage own onboarding forms" ON onboarding_forms;
    
    -- Create specific policies
    DROP POLICY IF EXISTS "Businesses can read own onboarding forms" ON onboarding_forms;
    DROP POLICY IF EXISTS "Businesses can insert own onboarding forms" ON onboarding_forms;
    DROP POLICY IF EXISTS "Businesses can update own onboarding forms" ON onboarding_forms;
    DROP POLICY IF EXISTS "Businesses can delete own onboarding forms" ON onboarding_forms;
    
    CREATE POLICY "Businesses can read own onboarding forms"
      ON onboarding_forms
      FOR SELECT
      TO authenticated
      USING (user_has_business_access(business_id));
    
    CREATE POLICY "Businesses can insert own onboarding forms"
      ON onboarding_forms
      FOR INSERT
      TO authenticated
      WITH CHECK (user_has_business_access(business_id));
    
    CREATE POLICY "Businesses can update own onboarding forms"
      ON onboarding_forms
      FOR UPDATE
      TO authenticated
      USING (user_has_business_access(business_id))
      WITH CHECK (user_has_business_access(business_id));
    
    CREATE POLICY "Businesses can delete own onboarding forms"
      ON onboarding_forms
      FOR DELETE
      TO authenticated
      USING (user_has_business_access(business_id));
  END IF;
END $$;

-- =====================================================
-- BUSINESSES TABLE - Ensure policies are correct
-- =====================================================

-- The businesses table should allow users to read their own business
-- and any business they have access to via tenant membership

DROP POLICY IF EXISTS "Businesses can read own data" ON businesses;
DROP POLICY IF EXISTS "Businesses can update own data" ON businesses;

CREATE POLICY "Businesses can read own data"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    (id = auth.uid()) -- Direct business owner
    OR 
    (tenant_id IN ( -- Tenant member access
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

CREATE POLICY "Businesses can update own data"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());