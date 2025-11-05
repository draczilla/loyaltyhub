/*
  # Add Orphaned Auth User Detection and Cleanup

  ## Overview
  This migration adds database functions to help detect and manage orphaned authentication
  records that exist in auth.users but have no corresponding business record. This situation
  can occur if tenant deletion partially fails or if there are race conditions during account
  creation/deletion.

  ## New Functions

  ### `find_orphaned_auth_users()`
  Returns a JSON array of orphaned auth users (users in auth.users without corresponding
  business records). Each entry includes:
  - user_id: The auth user ID
  - email: The user's email address
  - created_at: When the auth user was created
  - last_sign_in_at: Last sign-in timestamp (if any)

  This function is useful for super admins to audit and identify auth records that need cleanup.

  ### `check_auth_user_orphaned(user_email)`
  Checks if a specific email has an orphaned auth user record.
  Returns a JSON object with:
  - is_orphaned: Boolean indicating if the user is orphaned
  - user_id: The auth user ID (if orphaned)
  - email: The email address
  - message: Descriptive message about the status

  This function is useful for the create-company flow to detect and handle orphaned records
  before attempting to create new users.

  ## Security
  - Functions use SECURITY DEFINER for proper permission handling
  - Only super admins can execute these functions (enforced in application layer)
  - Functions are read-only and safe for auditing purposes
  - Set explicit search_path for security

  ## Important Notes
  1. These functions only detect orphaned records, they do not delete them
  2. Deletion of auth users must be done through Supabase Auth Admin API
  3. Regular audits should be performed to keep auth.users table clean
  4. Orphaned records can prevent email reuse and cause confusion
*/

-- Function to find all orphaned auth users (users without corresponding business records)
CREATE OR REPLACE FUNCTION find_orphaned_auth_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  orphaned_users jsonb;
BEGIN
  -- Find auth users that don't have a corresponding business record
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', au.id::text,
      'email', au.email,
      'created_at', au.created_at,
      'last_sign_in_at', au.last_sign_in_at,
      'email_confirmed_at', au.email_confirmed_at
    )
  )
  INTO orphaned_users
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = au.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM super_admins sa WHERE sa.id = au.id
  );

  RETURN COALESCE(orphaned_users, '[]'::jsonb);
END;
$$;

-- Function to check if a specific email has an orphaned auth user
CREATE OR REPLACE FUNCTION check_auth_user_orphaned(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_id uuid;
  has_business boolean;
  is_super_admin boolean;
  result jsonb;
BEGIN
  -- Find auth user with this email
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  -- If no auth user exists, return not orphaned
  IF auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_orphaned', false,
      'user_id', null,
      'email', user_email,
      'message', 'No auth user exists with this email'
    );
  END IF;

  -- Check if business record exists
  SELECT EXISTS(
    SELECT 1 FROM businesses WHERE id = auth_user_id
  ) INTO has_business;

  -- Check if super admin record exists
  SELECT EXISTS(
    SELECT 1 FROM super_admins WHERE id = auth_user_id
  ) INTO is_super_admin;

  -- Build result
  IF NOT has_business AND NOT is_super_admin THEN
    result := jsonb_build_object(
      'is_orphaned', true,
      'user_id', auth_user_id::text,
      'email', user_email,
      'message', 'Auth user exists without corresponding business or super_admin record'
    );
  ELSE
    result := jsonb_build_object(
      'is_orphaned', false,
      'user_id', auth_user_id::text,
      'email', user_email,
      'message', 'Auth user has corresponding database records'
    );
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
-- Note: Application layer should enforce super admin access
GRANT EXECUTE ON FUNCTION find_orphaned_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION check_auth_user_orphaned(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION find_orphaned_auth_users() IS 'Returns all auth users without corresponding business records. Used for audit and cleanup operations by super admins.';
COMMENT ON FUNCTION check_auth_user_orphaned(text) IS 'Checks if a specific email has an orphaned auth user record. Used during company creation to detect and handle orphaned records.';
