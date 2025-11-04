/*
  # Allow Super Admins to Update Subscription Tiers

  ## Overview
  Super admins need to be able to update subscription tier configurations
  including Stripe Price IDs, limits, and pricing.

  ## Changes
  1. Add UPDATE policy for super admins on subscription_tiers table

  ## Security
  - Only authenticated users in the super_admins table can update tiers
  - Regular tenants can still only read tiers (existing policy)
*/

-- Allow super admins to update subscription tiers
CREATE POLICY "Super admins can update subscription tiers"
  ON subscription_tiers FOR UPDATE
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
