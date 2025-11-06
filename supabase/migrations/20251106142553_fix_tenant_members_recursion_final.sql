/*
  # Fix Tenant Members Infinite Recursion - Final Fix

  ## Problem
  The RLS policy "Tenant admins and members can view members" has infinite recursion
  because it queries tenant_members table from within a policy on tenant_members itself.

  ## Solution
  Use the businesses table to check tenant membership instead of querying tenant_members.
  This breaks the recursion cycle while maintaining the same security checks.

  ## Changes
  1. Drop the problematic policy
  2. Create new policy that uses businesses table for membership check
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenant admins and members can view members" ON public.tenant_members;

-- Create new policy without recursion
CREATE POLICY "Tenant admins and members can view members"
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    -- Tenant admin can see all members
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = (SELECT auth.uid())
    )
    OR
    -- Users can see members of their own tenant via businesses table
    tenant_id IN (
      SELECT tenant_id FROM businesses 
      WHERE id = (SELECT auth.uid()) 
      AND tenant_id IS NOT NULL
    )
  );
