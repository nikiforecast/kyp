/*
  Usernames for login — stored in profiles, resolved to email at sign-in.
  Admins assign usernames via workspace team settings.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (
    username IS NULL OR username ~ '^[a-z0-9_]{3,30}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (username)
  WHERE username IS NOT NULL;

ALTER TABLE public.workspace_users
  ADD COLUMN IF NOT EXISTS username text;

COMMENT ON COLUMN public.workspace_users.username IS
  'Desired login username; applied to profiles when the user activates their membership.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "workspace admins can view member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_users wu_admin
      JOIN public.workspace_users wu_member
        ON wu_member.workspace_id = wu_admin.workspace_id
      WHERE wu_admin.user_id = auth.uid()
        AND wu_admin.status = 'active'
        AND wu_admin.role IN ('owner', 'admin')
        AND wu_member.user_id = profiles.user_id
        AND wu_member.status = 'active'
    )
    OR public.is_platform_admin()
  );

CREATE OR REPLACE FUNCTION public.normalize_username(p_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(p_username)), '');
$$;

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier text := lower(trim(p_identifier));
  v_email text;
BEGIN
  IF v_identifier IS NULL OR v_identifier = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' in v_identifier) > 0 THEN
    SELECT au.email INTO v_email
    FROM auth.users au
    WHERE lower(au.email) = v_identifier
    LIMIT 1;
    RETURN v_email;
  END IF;

  SELECT au.email INTO v_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.username = v_identifier
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_user_username(p_user_id uuid, p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  v_normalized := public.normalize_username(p_username);

  IF v_normalized IS NOT NULL AND v_normalized !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3–30 characters: lowercase letters, numbers, and underscores only';
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_platform_admin()
     AND NOT EXISTS (
       SELECT 1
       FROM public.workspace_users wu_admin
       JOIN public.workspace_users wu_member
         ON wu_member.workspace_id = wu_admin.workspace_id
       WHERE wu_admin.user_id = auth.uid()
         AND wu_admin.status = 'active'
         AND wu_admin.role IN ('owner', 'admin')
         AND wu_member.user_id = p_user_id
         AND wu_member.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Not authorized to set username for this user';
  END IF;

  IF v_normalized IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = v_normalized AND user_id IS DISTINCT FROM p_user_id
  ) THEN
    RAISE EXCEPTION 'Username is already taken';
  END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (p_user_id, v_normalized)
  ON CONFLICT (user_id) DO UPDATE
  SET username = EXCLUDED.username,
      updated_at = now();

  UPDATE public.workspace_users
  SET username = v_normalized,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_username(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_username(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_pending_username_to_profile(p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  SELECT wu.username INTO v_username
  FROM public.workspace_users wu
  WHERE wu.user_email = p_email
    AND wu.username IS NOT NULL
  ORDER BY wu.updated_at DESC
  LIMIT 1;

  IF v_username IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = v_username AND user_id IS DISTINCT FROM p_user_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (p_user_id, v_username)
  ON CONFLICT (user_id) DO UPDATE
  SET username = COALESCE(public.profiles.username, EXCLUDED.username),
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_pending_workspace_invites_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_updated integer;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.workspace_users
  SET user_id = p_user_id,
      status = 'active',
      updated_at = now()
  WHERE user_email = v_email
    AND user_id IS NULL
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  PERFORM public.apply_pending_username_to_profile(p_user_id, v_email);

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.apply_pending_username_to_profile(NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

INSERT INTO public.profiles (user_id)
SELECT au.id
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);

UPDATE public.profiles p
SET username = wu.username,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, username
  FROM public.workspace_users
  WHERE user_id IS NOT NULL AND username IS NOT NULL
  ORDER BY user_id, updated_at DESC
) wu
WHERE p.user_id = wu.user_id
  AND p.username IS NULL;
