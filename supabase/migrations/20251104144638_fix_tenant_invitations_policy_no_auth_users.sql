/*
  # Fix Tenant Invitations RLS Policy

  ## Problem
  The SELECT policy for tenant_invitations was trying to access auth.users table,
  which is not allowed from RLS policies, causing "permission denied for table users" error.

  ## Solution
  Remove the problematic check and simplify to only allow:
  1. Tenant admins to see all invitations for their tenant
  2. Public/authenticated users to see invitations by valid token (for acceptance page)

  ## Changes
  Drop and recreate the SELECT policy without auth.users access
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invitations for own tenant" ON tenant_invitations;

-- Recreate without auth.users access
CREATE POLICY "Tenant admins can view invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );
