/*
  # Fix Super Admin Policies to Use super_admins Table

  ## Overview
  Super admin policies were checking the businesses.is_super_admin flag,
  but super admins are actually stored in a separate super_admins table.
  This migration fixes all super admin policies to check the correct table.

  ## Changes
  1. Drop all existing super admin policies
  2. Recreate them to check the super_admins table instead of businesses.is_super_admin

  ## Security
  - Policies now correctly identify super admins from the super_admins table
  - Only authenticated users in super_admins can access all tenant data
*/

-- Drop existing super admin policies that use the wrong check
DROP POLICY IF EXISTS "Super admins can read all customers" ON customers;
DROP POLICY IF EXISTS "Super admins can update all customers" ON customers;
DROP POLICY IF EXISTS "Super admins can read all businesses" ON businesses;
DROP POLICY IF EXISTS "Super admins can update all businesses" ON businesses;
DROP POLICY IF EXISTS "Super admins can read all programs" ON loyalty_programs;
DROP POLICY IF EXISTS "Super admins can read all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Super admins can read all qr codes" ON qr_codes;
DROP POLICY IF EXISTS "Super admins can read all sms templates" ON sms_templates;
DROP POLICY IF EXISTS "Super admins can read all email templates" ON email_templates;
DROP POLICY IF EXISTS "Super admins can read all communication logs" ON communication_logs;

-- Recreate policies with correct super_admins table check

-- Businesses table
CREATE POLICY "Super admins can read all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

CREATE POLICY "Super admins can update all businesses"
  ON businesses FOR UPDATE
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

-- Customers table
CREATE POLICY "Super admins can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Loyalty programs table
CREATE POLICY "Super admins can read all programs"
  ON loyalty_programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Campaigns table
CREATE POLICY "Super admins can read all campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- QR codes table
CREATE POLICY "Super admins can read all qr codes"
  ON qr_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- SMS templates table
CREATE POLICY "Super admins can read all sms templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Email templates table
CREATE POLICY "Super admins can read all email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Communication logs table
CREATE POLICY "Super admins can read all communication logs"
  ON communication_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );
