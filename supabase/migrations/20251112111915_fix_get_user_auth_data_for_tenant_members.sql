/*
  # Fix get_user_auth_data Function for Tenant Members

  ## Problem
  The get_user_auth_data function only returns business data if the user's ID
  matches a business ID directly (user owns the business). Tenant members who
  are part of a team cannot get business context, causing the UI to fail.

  ## Solution
  Update the function to:
  1. First check if user is a super admin (existing behavior)
  2. Then check if user owns a business directly (existing behavior)
  3. NEW: If user is a tenant member, find the first business in their tenant
     and return that business data (team member access)
  4. Return 'none' only if user has no access anywhere

  ## Business Selection Logic for Tenant Members
  When a user is a tenant member but not a direct business owner:
  - Find the tenant they are an active member of
  - Return the first business in that tenant (ordered by created_at)
  - This gives team members access to their organization's business data
  - Future enhancement: allow users to switch between multiple businesses

  ## Security
  - Only returns data for active tenant members (status = 'active')
  - Maintains existing super admin and business owner checks
  - No cross-tenant data leakage
*/

-- Drop and recreate the function with updated logic
DROP FUNCTION IF EXISTS get_user_auth_data(uuid);

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

  -- NEW: Check if user is a tenant member (team member)
  -- Find the tenant where this user is an active member
  SELECT tenant_id INTO tenant_member_tenant_id
  FROM tenant_members
  WHERE user_id = user_id_param
    AND status = 'active'
  LIMIT 1;

  IF tenant_member_tenant_id IS NOT NULL THEN
    -- Get the first business in this tenant
    -- (Future: could allow user to select which business to work with)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_data(uuid) TO authenticated;