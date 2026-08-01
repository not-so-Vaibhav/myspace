-- ==============================================================================
-- MIT ADT UNIVERSITY - PASSWORD MANAGEMENT & RESET ENGINE
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to enable self-service password
-- reset (Forgot Password) and Change Password for all students and faculty.
-- ==============================================================================

-- 1. Ensure pgcrypto extension is available for bcrypt encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create the universal reset_user_password RPC function
CREATE OR REPLACE FUNCTION public.reset_user_password(
  target_email text,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_hashed_password text;
BEGIN
  -- Validate input
  IF target_email IS NULL OR TRIM(target_email) = '' THEN
    RETURN json_build_object('success', false, 'message', 'Please provide a valid email address.');
  END IF;

  IF new_password IS NULL OR LENGTH(TRIM(new_password)) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Password must be at least 6 characters long.');
  END IF;

  -- Find user in auth.users by email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(target_email));

  -- If user not found in auth.users, check public.profiles and create auth account on the fly
  IF v_user_id IS NULL THEN
    DECLARE
      v_profile_id uuid;
      v_full_name text;
      v_role text;
    BEGIN
      SELECT id, full_name, role INTO v_profile_id, v_full_name, v_role
      FROM public.profiles
      WHERE LOWER(email) = LOWER(TRIM(target_email));

      IF v_profile_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'No university account found with that email address.');
      END IF;

      -- Create auth.users entry on the fly for imported profile
      v_user_id := v_profile_id;
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid, v_user_id, 'authenticated', 'authenticated', TRIM(target_email),
        crypt(new_password, gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        json_build_object('full_name', v_full_name, 'role', v_role)::jsonb,
        NOW(), NOW(), '', '', '', ''
      ) ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        updated_at = NOW();

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_user_id, v_user_id,
        json_build_object('sub', v_user_id::text, 'email', TRIM(target_email))::jsonb,
        'email', v_user_id::text, NULL, NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;

      RETURN json_build_object('success', true, 'message', 'Account activated and password set successfully! You can now log in.');
    END;
  END IF;

  -- Generate bcrypt hash using pgcrypto extension
  v_hashed_password := crypt(new_password, gen_salt('bf'));

  -- Update auth.users encrypted_password
  UPDATE auth.users
  SET encrypted_password = v_hashed_password,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Password updated successfully! You can now log in.');
END;
$$;

-- 3. Grant execute permissions to anonymous, authenticated, and service roles
GRANT EXECUTE ON FUNCTION public.reset_user_password(text, text) TO anon, authenticated, service_role;

-- 4. Print status confirmation
SELECT 'Password management RPC function (reset_user_password) installed successfully!' AS result;
