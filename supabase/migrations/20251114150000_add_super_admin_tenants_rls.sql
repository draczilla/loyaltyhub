/*
  # Add Super Admin RLS Policies for Tenants Table

  ## Overview
  This migration adds Row Level Security policies to allow super admins
  to read, update, and manage all tenant records.

  ## Changes
  - Add super admin read policy on tenants table
  - Add super admin update policy on tenants table
  - Add super admin delete policy on tenants table (for tenant management)

  ## Security
  - Only authenticated users in the super_admins table can access all tenants
  - Regular users can only see their own tenant via existing policies
  - No data isolation issues - proper super admin verification
*/

-- Allow super admins to read all tenants
CREATE POLICY "Super admins can read all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Allow super admins to update all tenants
CREATE POLICY "Super admins can update all tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Allow super admins to delete tenants (via delete-tenant function)
CREATE POLICY "Super admins can delete tenants"
  ON tenants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Allow super admins to read all tenant_members
CREATE POLICY "Super admins can read all tenant members"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Allow super admins to read all tenant_invitations
CREATE POLICY "Super admins can read all tenant invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );
