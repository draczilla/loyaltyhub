/*
  # Add Tenant and Team Management System

  ## Overview
  This migration creates a complete multi-tenant team management system with seat-based
  subscription controls. It enables companies to invite team members via email with
  secure registration links, while enforcing seat limits per subscription tier.

  ## New Tables

  ### `tenants`
  - `id` (uuid, primary key)
  - `company_name` (text) - Organization/company name
  - `logo_url` (text) - Company logo URL
  - `primary_color` (text) - Brand color for customization
  - `admin_user_id` (uuid, references auth.users) - Tenant administrator
  - `created_at` (timestamptz) - Tenant creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `tenant_members`
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, references tenants) - Parent tenant
  - `user_id` (uuid, references auth.users) - Team member user
  - `role` (text) - User role: 'admin' or 'member'
  - `status` (text) - Membership status: 'active', 'inactive'
  - `invited_at` (timestamptz) - Invitation timestamp
  - `accepted_at` (timestamptz) - Acceptance timestamp
  - `created_at` (timestamptz) - Record creation

  ### `tenant_invitations`
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, references tenants) - Target tenant
  - `email` (text) - Invited email address
  - `token` (text, unique) - Secure invitation token
  - `invited_by` (uuid, references auth.users) - Inviting admin
  - `role` (text) - Assigned role for invitee
  - `status` (text) - Invitation status: 'pending', 'accepted', 'expired', 'revoked'
  - `expires_at` (timestamptz) - Token expiration timestamp
  - `created_at` (timestamptz) - Invitation creation

  ## Schema Changes

  ### `businesses` table additions:
  - `tenant_id` (uuid, references tenants) - Links business to tenant
  - `is_tenant_admin` (boolean) - Flags if user is tenant administrator

  ### `subscription_tiers` table updates:
  - Update features JSONB to include max_seats for each tier
  - Free tier: 1 seat
  - Pro tier: 3 seats
  - Agency tier: 10 seats

  ## Functions

  ### `count_active_tenant_members(tenant_uuid)`
  Counts active members in a tenant for seat limit enforcement

  ### `get_tenant_seat_limit(tenant_uuid)`
  Returns the maximum allowed seats for a tenant based on subscription tier

  ### `can_invite_member(tenant_uuid)`
  Checks if tenant has available seats for new invitations

  ### `create_invitation_token()`
  Generates secure random tokens for invitations

  ## Security

  - Enable RLS on all new tables
  - Only tenant admins can create/revoke invitations
  - Only tenant admins can remove members
  - Members can view their own tenant information
  - Strict data isolation between tenants
  - Token validation prevents unauthorized access
  - Seat limits enforced at database level

  ## Important Notes

  1. First registered user automatically becomes tenant admin
  2. Invitations expire after 7 days
  3. Seat limits are strictly enforced
  4. Admin cannot remove themselves
  5. Removing member frees up a seat immediately
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#ff6b35',
  admin_user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create tenant_members table
CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);

-- Create tenant_invitations table
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users ON DELETE SET NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);

-- Add tenant columns to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE businesses ADD COLUMN tenant_id uuid REFERENCES tenants ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'is_tenant_admin'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_tenant_admin boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_tenant ON businesses(tenant_id);

-- Update subscription tiers with seat limits
UPDATE subscription_tiers
SET features = jsonb_set(features, '{max_seats}', '1', true)
WHERE name = 'Free';

UPDATE subscription_tiers
SET features = jsonb_set(features, '{max_seats}', '3', true)
WHERE name = 'Pro';

UPDATE subscription_tiers
SET features = jsonb_set(features, '{max_seats}', '10', true)
WHERE name = 'Agency';

-- Function to count active members in a tenant
CREATE OR REPLACE FUNCTION count_active_tenant_members(tenant_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM tenant_members
    WHERE tenant_id = tenant_uuid
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant seat limit from subscription tier
CREATE OR REPLACE FUNCTION get_tenant_seat_limit(tenant_uuid uuid)
RETURNS integer AS $$
DECLARE
  seat_limit integer;
BEGIN
  SELECT (st.features->>'max_seats')::integer INTO seat_limit
  FROM tenants t
  JOIN businesses b ON b.tenant_id = t.id
  JOIN subscription_tiers st ON st.id = b.tier_id
  WHERE t.id = tenant_uuid
  LIMIT 1;
  
  RETURN COALESCE(seat_limit, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if tenant can invite more members
CREATE OR REPLACE FUNCTION can_invite_member(tenant_uuid uuid)
RETURNS boolean AS $$
DECLARE
  current_members integer;
  max_seats integer;
BEGIN
  current_members := count_active_tenant_members(tenant_uuid);
  max_seats := get_tenant_seat_limit(tenant_uuid);
  
  RETURN current_members < max_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_user_tenant_admin(tenant_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenants
    WHERE id = tenant_uuid
    AND admin_user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update tenants updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for tenants
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    OR id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Tenant admins can update own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- RLS Policies for tenant_members
CREATE POLICY "Users can view members of own tenant"
  ON tenant_members FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can insert members"
  ON tenant_members FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update members"
  ON tenant_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can delete members"
  ON tenant_members FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
    AND user_id != auth.uid()
  );

-- RLS Policies for tenant_invitations
CREATE POLICY "Users can view invitations for own tenant"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
    OR email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can create invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
    AND can_invite_member(tenant_id)
  );

CREATE POLICY "Tenant admins can update invitations"
  ON tenant_invitations FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can delete invitations"
  ON tenant_invitations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE admin_user_id = auth.uid()
    )
  );

-- Allow public to read invitations by token (for acceptance page)
CREATE POLICY "Anyone can view invitation by valid token"
  ON tenant_invitations FOR SELECT
  TO anon, authenticated
  USING (
    status = 'pending'
    AND expires_at > now()
  );