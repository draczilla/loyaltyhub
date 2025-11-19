/*
  # Fix Tenants Table Infinite Recursion

  ## Problem
  The RLS policy "Users can view own tenant" on the tenants table has infinite recursion
  because it queries tenant_members table, which in turn queries tenants table in its policies.
  This creates a circular dependency:
  - tenants SELECT policy → queries tenant_members
  - tenant_members SELECT policy → queries tenants
  
  ## Solution
  Simplify the tenants SELECT policy to avoid the circular dependency by:
  1. Only checking direct ownership (admin_user_id)
  2. Adding a separate helper function for safe tenant access that doesn't use RLS
  3. Using security definer functions where we need complex tenant membership checks

  ## Changes
  1. Drop the problematic "Users can view own tenant" policy
  2. Create a simpler policy that only checks direct admin ownership
  3. Create a security definer function to check tenant membership safely
  4. Add policy for tenant members to view their tenant using the safe function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;

-- Create a security definer function to safely check tenant membership
-- This bypasses RLS so it won't cause recursion
CREATE OR REPLACE FUNCTION public.is_tenant_member(tenant_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is the tenant admin
  IF EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = tenant_id_param 
    AND admin_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is an active tenant member
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

-- Create new simplified policy for viewing tenants
CREATE POLICY "Users can view accessible tenants"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    -- Direct admin access
    admin_user_id = auth.uid()
    OR
    -- Member access via safe function
    public.is_tenant_member(id)
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
