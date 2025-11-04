/*
  # Add INSERT Policy for Businesses Table

  ## Problem
  Users cannot create business records during signup because there's no INSERT policy.
  This causes "new row violates row-level security policy" errors.

  ## Solution
  Add an INSERT policy that allows authenticated users to create their own business record.

  ## Changes
  1. Add INSERT policy for businesses table
  2. Users can only insert a business record where id matches their auth.uid()
*/

CREATE POLICY "Users can create own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
