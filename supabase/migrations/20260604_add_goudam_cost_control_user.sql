-- Add Cost Control Engineer user.
-- Email: goudam@pzoneinternational.com
-- Initial password requested by admin: 123456

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id
    INTO target_user_id
    FROM auth.users
   WHERE lower(email) = lower('goudam@pzoneinternational.com')
   LIMIT 1;

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      email_change_token_new,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      'goudam@pzoneinternational.com',
      crypt('123456', gen_salt('bf')),
      now(),
      now(),
      '',
      now(),
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Cost Control Engineer","email_verified":true}'::jsonb,
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      target_user_id,
      target_user_id::text,
      jsonb_build_object(
        'sub', target_user_id::text,
        'email', 'goudam@pzoneinternational.com',
        'email_verified', true,
        'full_name', 'Cost Control Engineer'
      ),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('123456', gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Cost Control Engineer","email_verified":true}'::jsonb,
           updated_at = now()
     WHERE id = target_user_id;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    full_name,
    department
  )
  VALUES (
    target_user_id,
    'Cost Control Engineer',
    'Cost Control'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    updated_at = now();

  INSERT INTO public.user_roles (
    user_id,
    role
  )
  VALUES (
    target_user_id,
    'cost_control'::app_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
