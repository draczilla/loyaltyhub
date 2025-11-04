/*
  # Fix Infinite Recursion in Businesses RLS Policies

  ## Issue
  The super admin policies were causing infinite recursion by querying the businesses
  table from within the businesses table policies.

  ## Solution
  Remove the problematic super admin policies. Super admins can already read their own
  business record through the standard "Businesses can read own data" policy since
  they have a record in the businesses table.

  ## Changes
  - Drop the recursive super admin policies
  - Keep only the basic policies that check auth.uid() directly
*/

-- Drop the problematic super admin policies that cause recursion
DROP POLICY IF EXISTS "Super admins can read all businesses" ON businesses;
DROP POLICY IF EXISTS "Super admins can update all businesses" ON businesses;
