
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user with bcrypt-hashed password (email pre-confirmed)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'karl@driftpartner.no',
    crypt('Pmet@1971!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Add to super_admins table
  INSERT INTO super_admins (id, email, created_at)
  VALUES (new_user_id, 'karl@driftpartner.no', now());

END $$;
