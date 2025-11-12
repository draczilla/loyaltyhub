/*
  # Fix Tenant Member RLS Access for Business Resources

  ## Problem
  Tenant members (team members who are not the business owner) cannot access
  customers, campaigns, SMS templates, or email templates because RLS policies
  only check if business_id = auth.uid(). This fails for tenant members whose
  user ID doesn't match the business_id.

  ## Solution
  1. Create a helper function to check if a user has access to a business
     - Direct access: user owns the business (business_id = auth.uid())
     - Indirect access: user is an active member of the business's tenant
  
  2. Update RLS policies to use this helper function for all business resources:
     - customers table
     - campaigns table
     - sms_templates table
     - email_templates table
     - communication_logs table

  ## Changes
  - Add user_has_business_access() function
  - Update all business resource RLS policies
  - Maintain security: only active tenant members get access
  - Preserve existing direct business owner access

  ## Security
  - Restrictive by default: only authenticated users
  - Checks tenant membership status = 'active'
  - Verifies business belongs to same tenant as user
  - Prevents cross-tenant data access
*/

-- =====================================================
-- HELPER FUNCTION: Check if user has access to business
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_business_access(target_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_user_id uuid;
  business_tenant_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct access: user owns the business
  IF target_business_id = current_user_id THEN
    RETURN true;
  END IF;
  
  -- Indirect access: user is an active member of the business's tenant
  SELECT tenant_id INTO business_tenant_id
  FROM businesses
  WHERE id = target_business_id;
  
  IF business_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is an active member of this tenant
  RETURN EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = business_tenant_id
      AND user_id = current_user_id
      AND status = 'active'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_business_access(uuid) TO authenticated;

-- =====================================================
-- CUSTOMERS TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own customers" ON customers;
DROP POLICY IF EXISTS "Businesses can insert own customers" ON customers;
DROP POLICY IF EXISTS "Businesses can update own customers" ON customers;
DROP POLICY IF EXISTS "Businesses can delete own customers" ON customers;

CREATE POLICY "Businesses can read own customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- CAMPAIGNS TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own campaigns" ON campaigns;

CREATE POLICY "Businesses can read own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- SMS_TEMPLATES TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own SMS templates" ON sms_templates;

CREATE POLICY "Businesses can read own SMS templates"
  ON sms_templates
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own SMS templates"
  ON sms_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own SMS templates"
  ON sms_templates
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own SMS templates"
  ON sms_templates
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- EMAIL_TEMPLATES TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own email templates" ON email_templates;
DROP POLICY IF EXISTS "Businesses can insert own email templates" ON email_templates;
DROP POLICY IF EXISTS "Businesses can update own email templates" ON email_templates;
DROP POLICY IF EXISTS "Businesses can delete own email templates" ON email_templates;

CREATE POLICY "Businesses can read own email templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own email templates"
  ON email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own email templates"
  ON email_templates
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own email templates"
  ON email_templates
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- COMMUNICATION_LOGS TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can read own communication logs" ON communication_logs;
DROP POLICY IF EXISTS "Businesses can insert own communication logs" ON communication_logs;

CREATE POLICY "Businesses can read own communication logs"
  ON communication_logs
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own communication logs"
  ON communication_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

-- =====================================================
-- LOYALTY_PROGRAMS TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own loyalty programs" ON loyalty_programs;

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
-- QR_CODES TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own QR codes" ON qr_codes;

CREATE POLICY "Businesses can read own QR codes"
  ON qr_codes
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own QR codes"
  ON qr_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own QR codes"
  ON qr_codes
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own QR codes"
  ON qr_codes
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));

-- =====================================================
-- INTEGRATIONS TABLE - Update RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Businesses can manage own integrations" ON integrations;

CREATE POLICY "Businesses can read own integrations"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (user_has_business_access(business_id));

CREATE POLICY "Businesses can insert own integrations"
  ON integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can update own integrations"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (user_has_business_access(business_id))
  WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Businesses can delete own integrations"
  ON integrations
  FOR DELETE
  TO authenticated
  USING (user_has_business_access(business_id));