/*
  # Allow Public Read Access to Subscription Tiers

  ## Changes
  - Add RLS policy to allow anyone (including unauthenticated users) to read subscription tier information
  - This is necessary for the sign-up page and landing page to display pricing information

  ## Security
  - Read-only access for public users
  - No write access allowed for unauthenticated users
*/

CREATE POLICY "Anyone can read subscription tiers"
  ON subscription_tiers FOR SELECT
  TO anon, authenticated
  USING (true);
