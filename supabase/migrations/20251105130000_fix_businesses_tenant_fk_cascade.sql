/*
  # Fix businesses tenant_id foreign key constraint

  ## Problem
  The businesses.tenant_id foreign key was set to ON DELETE SET NULL, which means
  when a tenant is deleted, businesses remain in the database with tenant_id set to NULL
  instead of being deleted along with the tenant.

  ## Solution
  Drop the existing foreign key constraint and recreate it with ON DELETE CASCADE
  so that when a tenant is deleted, all associated businesses are automatically deleted.

  ## Changes
  - Drop existing businesses_tenant_id_fkey constraint
  - Add new constraint with ON DELETE CASCADE
*/

-- Drop the existing foreign key constraint
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_tenant_id_fkey;

-- Add the new constraint with CASCADE
ALTER TABLE businesses
  ADD CONSTRAINT businesses_tenant_id_fkey
  FOREIGN KEY (tenant_id)
  REFERENCES tenants(id)
  ON DELETE CASCADE;

-- Clean up any orphaned businesses that have NULL tenant_id
-- These are from previously deleted tenants
DELETE FROM businesses WHERE tenant_id IS NULL AND is_super_admin = false;
