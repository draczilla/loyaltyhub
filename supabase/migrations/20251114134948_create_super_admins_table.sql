-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can read their own record
CREATE POLICY "Super admins can read own record"
  ON super_admins FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Super admins can view all super admin records (for management)
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_super_admins_id ON super_admins(id);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);

-- Create trigger for updated_at
CREATE TRIGGER update_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert super admin users
-- Note: These users must already exist in auth.users table
-- If they don't exist, these inserts will fail due to foreign key constraint
DO $$
DECLARE
  karl_user_id uuid;
  gyldenhorn_user_id uuid;
BEGIN
  -- Get user ID for karl@medias.no
  SELECT id INTO karl_user_id
  FROM auth.users
  WHERE email = 'karl@medias.no';

  -- Get user ID for gyldenhorn@gmail.com
  SELECT id INTO gyldenhorn_user_id
  FROM auth.users
  WHERE email = 'gyldenhorn@gmail.com';

  -- Insert karl@medias.no if user exists
  IF karl_user_id IS NOT NULL THEN
    INSERT INTO super_admins (id, email)
    VALUES (karl_user_id, 'karl@medias.no')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Added karl@medias.no as super admin (user_id: %)', karl_user_id;
  ELSE
    RAISE WARNING 'User karl@medias.no not found in auth.users - cannot add as super admin. Please create this user account first.';
  END IF;

  -- Insert gyldenhorn@gmail.com if user exists
  IF gyldenhorn_user_id IS NOT NULL THEN
    INSERT INTO super_admins (id, email)
    VALUES (gyldenhorn_user_id, 'gyldenhorn@gmail.com')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Added gyldenhorn@gmail.com as super admin (user_id: %)', gyldenhorn_user_id;
  ELSE
    RAISE WARNING 'User gyldenhorn@gmail.com not found in auth.users - cannot add as super admin. Please create this user account first.';
  END IF;
END $$;