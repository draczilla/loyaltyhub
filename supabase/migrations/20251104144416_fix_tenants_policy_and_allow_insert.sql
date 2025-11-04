/*
  # Fix Tenants RLS Policies

  ## Problem
  1. Tenants SELECT policy had potential recursion via tenant_members check
  2. Missing INSERT policy prevented users from creating tenants

  ## Solution
  1. Simplify SELECT policy to avoid recursion by using businesses table
  2. Add INSERT policy allowing authenticated users to create tenants
  
  ## Changes
  1. Drop and recreate SELECT policy without recursion
  2. Add INSERT policy for tenant creation
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;

-- Recreate SELECT policy without recursion
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    -- Admin can see their tenant
    admin_user_id = auth.uid()
    OR
    -- Users can see tenant they belong to via businesses table
    id IN (
      SELECT tenant_id FROM businesses WHERE id = auth.uid() AND tenant_id IS NOT NULL
    )
  );

-- Add INSERT policy to allow tenant creation
CREATE POLICY "Users can create own tenant"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
  );
