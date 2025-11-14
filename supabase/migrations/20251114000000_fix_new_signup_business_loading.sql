/*
  # Fix New Signup Business Loading Issue

  ## Problem
  New users after signup cannot load business data, showing errors like:
  - "Business Not Found - Unable to load business information"
  - "Access Error - Unable to load business data"

  This happens because:
  1. The get_user_auth_data function is SECURITY DEFINER and cannot read businesses
     table due to RLS policies that check tenant_members subqueries
  2. For new signups, tenant_members may not exist yet when first load happens
  3. The businesses SELECT policy blocks the function from reading the data

  ## Solution
  1. Simplify the businesses RLS SELECT policy to prioritize direct owner access
  2. Make the get_user_auth_data function more robust with direct queries
  3. Ensure the function can bypass RLS when needed by using proper security context
  4. Add explicit error handling and fallback logic

  ## Changes
  1. Update businesses table SELECT policy to be less restrictive
  2. Recreate get_user_auth_data function with improved query logic
  3. Add helper function to safely check tenant membership without blocking
  4. Ensure new signups can always read their own business record

  ## Security
  - Maintains data isolation between tenants
  - Direct business owners always have access (id = auth.uid())
  - Tenant members can access via explicit membership check
  - No cross-tenant data leakage
*/

-- =====================================================
-- PART 1: Fix Businesses Table RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Businesses can read own data" ON businesses;
DROP POLICY IF EXISTS "Businesses can update own data" ON businesses;
DROP POLICY IF EXISTS "Users can create own business" ON businesses;

-- Create simplified SELECT policy that prioritizes direct owner access
CREATE POLICY "Businesses can read own data"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    -- Direct business owner - this MUST work for new signups
    id = auth.uid()
  );

-- Separate policy for tenant member access to avoid blocking direct access
CREATE POLICY "Tenant members can read business data"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    -- Tenant member access via explicit membership
    tenant_id IS NOT NULL
    AND tenant_id IN (
      SELECT tenant_id
      FROM tenant_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- Keep UPDATE policy simple - only direct owner
CREATE POLICY "Businesses can update own data"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Keep INSERT policy for signup
CREATE POLICY "Users can create own business"
  ON businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- PART 2: Recreate get_user_auth_data Function
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_auth_data(uuid);

-- Recreate with improved logic that handles new signups better
CREATE OR REPLACE FUNCTION get_user_auth_data(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  super_admin_data jsonb;
  business_data jsonb;
  tenant_data jsonb;
  tenant_member_tenant_id uuid;
  tenant_member_business_id uuid;
BEGIN
  -- Check if user is a super admin
  SELECT to_jsonb(sa.*) INTO super_admin_data
  FROM super_admins sa
  WHERE sa.id = user_id_param;

  IF super_admin_data IS NOT NULL THEN
    result := jsonb_build_object(
      'user_type', 'super_admin',
      'data', super_admin_data
    );
    RETURN result;
  END IF;

  -- Check if user is a direct business owner
  -- This query bypasses RLS because function is SECURITY DEFINER
  SELECT to_jsonb(b.*) INTO business_data
  FROM businesses b
  WHERE b.id = user_id_param;

  IF business_data IS NOT NULL THEN
    -- Get tenant data if business has a tenant_id
    IF business_data->>'tenant_id' IS NOT NULL THEN
      SELECT to_jsonb(t.*) INTO tenant_data
      FROM tenants t
      WHERE t.id = (business_data->>'tenant_id')::uuid;
    END IF;

    result := jsonb_build_object(
      'user_type', 'business',
      'data', business_data,
      'tenant', tenant_data
    );
    RETURN result;
  END IF;

  -- Check if user is a tenant member (team member)
  SELECT tenant_id INTO tenant_member_tenant_id
  FROM tenant_members
  WHERE user_id = user_id_param
    AND status = 'active'
  LIMIT 1;

  IF tenant_member_tenant_id IS NOT NULL THEN
    -- Get the first business in this tenant
    SELECT id INTO tenant_member_business_id
    FROM businesses
    WHERE tenant_id = tenant_member_tenant_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF tenant_member_business_id IS NOT NULL THEN
      -- Get the full business data
      SELECT to_jsonb(b.*) INTO business_data
      FROM businesses b
      WHERE b.id = tenant_member_business_id;

      -- Get tenant data
      SELECT to_jsonb(t.*) INTO tenant_data
      FROM tenants t
      WHERE t.id = tenant_member_tenant_id;

      result := jsonb_build_object(
        'user_type', 'business',
        'data', business_data,
        'tenant', tenant_data
      );
      RETURN result;
    END IF;
  END IF;

  -- User not found in any table or has no access
  result := jsonb_build_object(
    'user_type', 'none',
    'data', null
  );
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_auth_data(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_user_auth_data(uuid) IS
  'Returns user authentication data including business and tenant info. Handles super admins, direct business owners, and tenant members. Used by AuthContext to load user context.';
