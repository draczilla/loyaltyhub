/*
  # Fix Infinite Recursion in Tenant Members RLS Policies

  ## Problem
  The RLS policy for tenant_members was checking tenant_members within itself,
  causing infinite recursion errors.

  ## Solution
  Simplify the policies to avoid recursive checks:
  - Use direct tenant admin check via tenants table
  - Use businesses table to check tenant membership instead of recursive tenant_members check
  
  ## Changes
  1. Drop existing problematic policies
  2. Create new simplified policies that avoid recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of own tenant" ON tenant_members;
DROP POLICY IF EXISTS "Tenant admins can insert members" ON tenant_members;
DROP POLICY IF EXISTS "Tenant admins can update members" ON tenant_members;
DROP POLICY IF EXISTS "Tenant admins can delete members" ON tenant_members;

-- Recreate policies without recursion
CREATE POLICY "Tenant admins and members can view members"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    -- Tenant admin can see all members
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
    OR
    -- Users can see members of their own tenant via businesses table
    tenant_id IN (
      SELECT tenant_id FROM businesses WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
  );

CREATE POLICY "Tenant admins can insert members"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update members"
  ON tenant_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can delete members"
  ON tenant_members FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
    AND user_id != auth.uid()
  );
