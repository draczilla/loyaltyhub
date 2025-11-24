/*
  # Fix Communication Logs and Tenant Invitations Issues

  ## Problems
  1. Dashboard queries `opened_at` column which doesn't exist in communication_logs
  2. Querying tenant_invitations causes "permission denied for table users" error

  ## Solutions
  1. Add `opened_at` column to communication_logs for email tracking
  2. Fix tenant_invitations RLS policies that may be referencing auth.users incorrectly

  ## Changes
  1. Add opened_at column to communication_logs
  2. Review and fix tenant_invitations policies
*/

-- Add opened_at column to communication_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'communication_logs' AND column_name = 'opened_at'
  ) THEN
    ALTER TABLE communication_logs ADD COLUMN opened_at timestamptz;
  END IF;
END $$;

-- Add index for performance when querying opened emails
CREATE INDEX IF NOT EXISTS idx_communication_logs_opened_at 
  ON communication_logs(business_id, type, opened_at) 
  WHERE opened_at IS NOT NULL;

-- Check and fix tenant_invitations policies
-- First, let's see what policies exist and might be causing the issue
DO $$
BEGIN
  -- Drop problematic policies that might reference auth.users
  DROP POLICY IF EXISTS "Tenant admins can manage invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Tenant admins can view invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Tenant admins can insert invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Tenant admins can update invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Tenant admins can delete invitations" ON tenant_invitations;
  DROP POLICY IF EXISTS "Users can view own invitations" ON tenant_invitations;
END $$;

-- Create safe policies for tenant_invitations that don't reference auth.users
CREATE POLICY "Tenant admins can view invitations"
  ON tenant_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- Tenant admin check using safe function
    public.user_is_member_of_tenant(tenant_id)
  );

CREATE POLICY "Tenant admins can insert invitations"
  ON tenant_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only tenant admins can invite
    public.user_is_member_of_tenant(tenant_id)
  );

CREATE POLICY "Tenant admins can update invitations"
  ON tenant_invitations
  FOR UPDATE
  TO authenticated
  USING (
    public.user_is_member_of_tenant(tenant_id)
  )
  WITH CHECK (
    public.user_is_member_of_tenant(tenant_id)
  );

CREATE POLICY "Tenant admins can delete invitations"
  ON tenant_invitations
  FOR DELETE
  TO authenticated
  USING (
    public.user_is_member_of_tenant(tenant_id)
  );

-- Also allow invited users to view their own invitation (by email column)
CREATE POLICY "Users can view own invitations"
  ON tenant_invitations
  FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT b.email FROM businesses b WHERE b.id = auth.uid()
    )
  );

COMMENT ON COLUMN communication_logs.opened_at IS 'Timestamp when the email was opened by the recipient (email tracking)';
