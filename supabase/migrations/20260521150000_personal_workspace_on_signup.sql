/*
  Provision a personal workspace for every new auth user.

  - Creates a workspace owned by the new user (add_workspace_owner trigger adds owner row)
  - Sets full_name on the owner membership when available from OAuth metadata
  - @legl.com users are also added to the shared Legl workspace as members
*/

CREATE OR REPLACE FUNCTION public.extract_user_full_name(user_row auth.users)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(TRIM(COALESCE(
    user_row.raw_user_meta_data->>'full_name',
    user_row.raw_user_meta_data->>'name',
    user_row.raw_user_meta_data->>'display_name',
    user_row.raw_app_meta_data->>'full_name',
    user_row.raw_app_meta_data->>'name',
    ''
  )), '');
$$;

CREATE OR REPLACE FUNCTION public.personal_workspace_name(user_row auth.users)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_full_name text;
  v_local_part text;
BEGIN
  v_full_name := public.extract_user_full_name(user_row);

  IF v_full_name IS NOT NULL THEN
    RETURN v_full_name || '''s Workspace';
  END IF;

  v_local_part := split_part(COALESCE(user_row.email, 'user'), '@', 1);
  RETURN v_local_part || '''s Workspace';
END;
$$;

CREATE OR REPLACE FUNCTION public.add_user_to_legl_workspace(user_row auth.users)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  legl_workspace_id uuid;
  v_user_email text;
  user_full_name text;
BEGIN
  v_user_email := user_row.email;

  IF v_user_email IS NULL OR NOT (v_user_email ILIKE '%@legl.com') THEN
    RETURN;
  END IF;

  user_full_name := public.extract_user_full_name(user_row);

  SELECT id INTO legl_workspace_id
  FROM public.workspaces
  WHERE name = 'Legl'
  LIMIT 1;

  IF legl_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, created_by)
    VALUES ('Legl', user_row.id)
    RETURNING id INTO legl_workspace_id;
  END IF;

  INSERT INTO public.workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    user_row.id,
    v_user_email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_personal_workspace(user_row auth.users)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  personal_workspace_id uuid;
  user_full_name text;
BEGIN
  IF user_row.email IS NULL THEN
    RAISE EXCEPTION 'Cannot provision workspace without user email';
  END IF;

  -- Idempotent: reuse an existing personal workspace created for this user
  SELECT w.id INTO personal_workspace_id
  FROM public.workspaces w
  WHERE w.created_by = user_row.id
  ORDER BY w.created_at ASC
  LIMIT 1;

  IF personal_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, created_by)
    VALUES (public.personal_workspace_name(user_row), user_row.id)
    RETURNING id INTO personal_workspace_id;
  END IF;

  user_full_name := public.extract_user_full_name(user_row);

  IF user_full_name IS NOT NULL THEN
    UPDATE public.workspace_users wu
    SET full_name = user_full_name,
        updated_at = now()
    WHERE wu.workspace_id = personal_workspace_id
      AND wu.user_id = user_row.id;
  END IF;

  RETURN personal_workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.provision_personal_workspace(NEW);
  PERFORM public.add_user_to_legl_workspace(NEW);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to provision workspace for new user %: %', NEW.email, SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_signup();

-- Keep @legl.com membership when email is updated later
CREATE OR REPLACE FUNCTION public.auto_add_legl_user_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;

  IF OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  PERFORM public.add_user_to_legl_workspace(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_legl_user_on_update();
