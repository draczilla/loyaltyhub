/*
  # Fix Super Admins Self-Referencing Recursion

  ## Problem
  The policy "Super admins can view all super admins" on the super_admins table
  queries the super_admins table itself, causing infinite recursion:
  - super_admins SELECT policy → queries super_admins table
  - which triggers the same SELECT policy → infinite loop
  
  ## Solution
  Remove the redundant self-referencing policy. We already have:
  1. "Super admins can read own record" - allows reading own data (id = auth.uid())
  2. "Super admins can read own data" - duplicate of above
  
  The self-referencing "view all" policy is unnecessary and causes recursion.
  Super admins only need to read their own record from this table.

  ## Changes
  1. Drop the problematic self-referencing policy
  2. Remove duplicate policies and keep the simplest one
  3. If super admins need to view all super admins, create a secure definer function
*/

-- Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "Super admins can view all super admins" ON public.super_admins;

-- Drop the duplicate policy (keep the simpler one)
DROP POLICY IF EXISTS "Super admins can read own data" ON public.super_admins;

-- Keep only the simple, direct policy
-- This one already exists: "Super admins can read own record"
-- It uses: id = auth.uid() which is direct and doesn't cause recursion

-- If we need super admins to view ALL super admin records, use a function
-- Create a security definer function to check if user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check without triggering RLS
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE id = auth.uid()
  );
END;
$$;

-- Create a view for super admins to see all super admin records
-- This uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE VIEW public.all_super_admins
WITH (security_invoker = false) AS
SELECT id, email, created_at
FROM super_admins;

-- Grant access to authenticated users (they'll need to be super admins to use it effectively)
GRANT SELECT ON public.all_super_admins TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_super_admin() IS 'Safely checks if current user is a super admin without triggering RLS recursion';
COMMENT ON VIEW public.all_super_admins IS 'Security definer view for super admins to view all super admin records without RLS recursion';
