/*
  Activate pending workspace invites for existing users.

  New signups were already handled by activate_pending_workspace_invites on INSERT.
  Existing auth users who are invited remain pending until they sign in again.
*/

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
  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_my_pending_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  RETURN public.activate_pending_workspace_invites_for_user(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.activate_pending_workspace_invites_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_my_pending_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_my_pending_invites() TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_pending_workspace_invites_on_signin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    PERFORM public.activate_pending_workspace_invites_for_user(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_activate_invites ON auth.users;
CREATE TRIGGER on_auth_user_activate_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_pending_workspace_invites_on_signin();

DROP TRIGGER IF EXISTS on_auth_user_signin_activate_invites ON auth.users;
CREATE TRIGGER on_auth_user_signin_activate_invites
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_pending_workspace_invites_on_signin();

-- Backfill: link any pending invites to existing auth accounts
UPDATE public.workspace_users wu
SET user_id = au.id,
    status = 'active',
    updated_at = now()
FROM auth.users au
WHERE wu.user_email = au.email
  AND wu.user_id IS NULL
  AND wu.status = 'pending';
