/*
  Platform admin workspace controls.

  - Platform admins are users with app_metadata.is_admin = true in Supabase Auth
  - Only platform admins can create new workspaces (personal workspaces still
    provisioned via SECURITY DEFINER signup trigger)
  - Pending workspace invites are activated when the invited user signs up
*/

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

DROP POLICY IF EXISTS "authenticated users can create workspaces" ON public.workspaces;

CREATE POLICY "platform admins can create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() AND created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.activate_pending_workspace_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workspace_users
  SET user_id = NEW.id,
      status = 'active',
      updated_at = now()
  WHERE user_email = NEW.email
    AND user_id IS NULL
    AND status = 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_activate_invites ON auth.users;
CREATE TRIGGER on_auth_user_activate_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_pending_workspace_invites();
