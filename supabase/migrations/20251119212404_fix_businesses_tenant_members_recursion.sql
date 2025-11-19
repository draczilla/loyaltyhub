/*
  # Fix Businesses and Tenant Members Infinite Recursion

  ## Problem
  There's a circular dependency between businesses and tenant_members RLS policies:
  - businesses "Tenant members can read business data" → queries tenant_members
  - tenant_members "Tenant admins and members can view members" → queries businesses
  
  This causes infinite recursion when trying to load business data.

  ## Solution
  Create security definer functions that bypass RLS to safely check memberships,
  then use these functions in the policies to break the circular dependency.

  ## Changes
  1. Create helper function to check if user is a tenant member (bypasses RLS)
  2. Create helper function to check if user can access business (bypasses RLS)
  3. Update businesses SELECT policy to use the safe function
  4. Update tenant_members SELECT policy to use the safe function
*/

-- Create function to safely check if user is member of a tenant
-- This bypasses RLS so it won't cause recursion
CREATE OR REPLACE FUNCTION public.user_is_member_of_tenant(tenant_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is the tenant admin (direct check, no RLS)
  IF EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = tenant_id_param 
    AND admin_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is an active tenant member (direct check, no RLS)
  IF EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = tenant_id_param
    AND user_id = auth.uid()
    AND status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to safely check if user owns or is member of business's tenant
CREATE OR REPLACE FUNCTION public.user_can_access_business(business_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Check if user owns the business (direct check)
  IF business_id_param = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Get the business's tenant_id (direct check, no RLS)
  SELECT tenant_id INTO v_tenant_id
  FROM businesses
  WHERE id = business_id_param;
  
  -- If no tenant, only owner can access
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is member of the tenant (direct check, no RLS)
  RETURN public.user_is_member_of_tenant(v_tenant_id);
END;
$$;

-- Drop and recreate the problematic policies

-- Fix businesses SELECT policy
DROP POLICY IF EXISTS "Tenant members can read business data" ON public.businesses;

CREATE POLICY "Tenant members can read business data"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    -- Direct ownership
    id = auth.uid()
    OR
    -- Member access via safe function (breaks recursion)
    (tenant_id IS NOT NULL AND public.user_is_member_of_tenant(tenant_id))
  );

-- Fix tenant_members SELECT policy
DROP POLICY IF EXISTS "Tenant admins and members can view members" ON public.tenant_members;

CREATE POLICY "Tenant admins and members can view members"
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    -- Use safe function to check membership (breaks recursion)
    public.user_is_member_of_tenant(tenant_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_is_member_of_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_business(uuid) TO authenticated;
