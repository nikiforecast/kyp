/*
  Workspace-scoped RLS for all core tables.

  Uses SECURITY DEFINER helpers so policies can check workspace_users without
  infinite recursion. Membership matches auth.uid() on workspace_users.user_id.
*/

-- Replace any prior helper definitions (parameter names may differ)
DROP FUNCTION IF EXISTS public.can_access_user_journey_node(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_theme(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_example(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_research_note(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_asset(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_user_story(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_user_journey(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_user_workspace_ids() CASCADE;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — bypass RLS on workspace_users)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wu.workspace_id
  FROM public.workspace_users wu
  WHERE wu.status = 'active'
    AND wu.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws_id IN (SELECT public.current_user_workspace_ids());
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users wu
    WHERE wu.workspace_id = ws_id
      AND wu.user_id = auth.uid()
      AND wu.status = 'active'
      AND wu.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND public.is_workspace_member(p.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_journey(p_journey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_journeys uj
    LEFT JOIN public.projects p ON p.id = uj.project_id
    LEFT JOIN public.user_journey_folders f ON f.id = uj.folder_id
    WHERE uj.id = p_journey_id
      AND (
        (uj.project_id IS NOT NULL AND public.is_workspace_member(p.workspace_id))
        OR (uj.folder_id IS NOT NULL AND public.is_workspace_member(f.workspace_id))
        OR (uj.project_id IS NULL AND uj.folder_id IS NULL AND uj.created_by = auth.uid())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_story(p_story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_stories us
    JOIN public.projects p ON p.id = us.project_id
    WHERE us.id = p_story_id
      AND public.is_workspace_member(p.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assets a
    JOIN public.projects p ON p.id = a.project_id
    WHERE a.id = p_asset_id
      AND public.is_workspace_member(p.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_research_note(p_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.research_notes rn
    JOIN public.projects p ON p.id = rn.project_id
    WHERE rn.id = p_note_id
      AND public.is_workspace_member(p.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_example(p_example_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.examples e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = p_example_id
      AND public.is_workspace_member(p.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_theme(p_theme_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.themes t
    WHERE t.id = p_theme_id
      AND public.is_workspace_member(t.workspace_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_user_journey_node(p_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_journey_nodes ujn
    WHERE ujn.id = p_node_id
      AND public.can_access_user_journey(ujn.user_journey_id)
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_workspace_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_user_journey(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_user_story(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_asset(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_research_note(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_example(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_theme(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_user_journey_node(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_workspace_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user_journey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user_story(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_research_note(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_example(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_theme(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user_journey_node(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop all existing policies on affected tables (idempotent reset)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'workspaces', 'workspace_users', 'projects', 'stakeholders', 'research_notes',
        'platforms', 'third_parties', 'law_firms', 'law_firm_custom_columns', 'law_firm_custom_values',
        'law_firm_user_journeys', 'user_roles', 'user_permissions', 'themes', 'note_templates',
        'user_journey_folders', 'problem_overviews', 'project_stakeholders',
        'project_progress_status', 'project_progress_comments', 'user_stories', 'user_story_roles',
        'user_story_comments', 'user_journeys', 'user_journey_nodes', 'user_journey_stakeholders',
        'user_journey_node_answers', 'user_journey_comments', 'examples', 'example_user_roles',
        'example_comments', 'assets', 'asset_comments', 'asset_user_stories', 'asset_research_notes',
        'note_links', 'research_note_stakeholders', 'tasks', 'theme_user_stories', 'theme_user_journeys',
        'theme_research_notes', 'theme_assets'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can view workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR created_by = auth.uid());

CREATE POLICY "authenticated users can create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "workspace admins can update workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(id) OR created_by = auth.uid())
  WITH CHECK (public.is_workspace_admin(id) OR created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- workspace_users
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can view workspace users"
  ON public.workspace_users FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

CREATE POLICY "workspace admins can insert workspace users"
  ON public.workspace_users FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "workspace admins can update workspace users"
  ON public.workspace_users FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "workspace admins can delete workspace users"
  ON public.workspace_users FOR DELETE TO authenticated
  USING (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- Direct workspace_id tables
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage stakeholders"
  ON public.stakeholders FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage platforms"
  ON public.platforms FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage third parties"
  ON public.third_parties FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage law firms"
  ON public.law_firms FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can view law firm custom columns"
  ON public.law_firm_custom_columns FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace admins can manage law firm custom columns"
  ON public.law_firm_custom_columns FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "workspace members can manage law firm custom values"
  ON public.law_firm_custom_values FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage user permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage themes"
  ON public.themes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage note templates"
  ON public.note_templates FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace members can manage user journey folders"
  ON public.user_journey_folders FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Project-scoped tables
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can manage research notes"
  ON public.research_notes FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage problem overviews"
  ON public.problem_overviews FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage project stakeholders"
  ON public.project_stakeholders FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage project progress status"
  ON public.project_progress_status FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can view project progress comments"
  ON public.project_progress_comments FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "workspace members can create project progress comments"
  ON public.project_progress_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can update own project progress comments"
  ON public.project_progress_comments FOR UPDATE TO authenticated
  USING (public.can_access_project(project_id) AND auth.uid() = user_id)
  WITH CHECK (public.can_access_project(project_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can delete own project progress comments"
  ON public.project_progress_comments FOR DELETE TO authenticated
  USING (public.can_access_project(project_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can manage user stories"
  ON public.user_stories FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage assets"
  ON public.assets FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage examples"
  ON public.examples FOR ALL TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "workspace members can manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (user_story_id IS NOT NULL AND public.can_access_user_story(user_story_id))
    OR (research_note_id IS NOT NULL AND public.can_access_research_note(research_note_id))
  )
  WITH CHECK (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (user_story_id IS NOT NULL AND public.can_access_user_story(user_story_id))
    OR (research_note_id IS NOT NULL AND public.can_access_research_note(research_note_id))
  );

-- ---------------------------------------------------------------------------
-- User journeys (preserve public sharing for anon)
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can manage user journeys"
  ON public.user_journeys FOR ALL TO authenticated
  USING (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (folder_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_journey_folders f
      WHERE f.id = folder_id AND public.is_workspace_member(f.workspace_id)
    ))
    OR (project_id IS NULL AND folder_id IS NULL AND (created_by = auth.uid() OR created_by IS NULL))
  )
  WITH CHECK (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (folder_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_journey_folders f
      WHERE f.id = folder_id AND public.is_workspace_member(f.workspace_id)
    ))
    OR (project_id IS NULL AND folder_id IS NULL AND (created_by = auth.uid() OR created_by IS NULL))
  );

CREATE POLICY "anonymous users can read publicly shared journeys"
  ON public.user_journeys FOR SELECT TO anon
  USING (is_publicly_shared = true AND public_id IS NOT NULL);

CREATE POLICY "workspace members can manage user journey nodes"
  ON public.user_journey_nodes FOR ALL TO authenticated
  USING (public.can_access_user_journey(user_journey_id))
  WITH CHECK (public.can_access_user_journey(user_journey_id));

CREATE POLICY "workspace members can manage user journey stakeholders"
  ON public.user_journey_stakeholders FOR ALL TO authenticated
  USING (public.can_access_user_journey(user_journey_id))
  WITH CHECK (public.can_access_user_journey(user_journey_id));

CREATE POLICY "workspace members can manage user journey node answers"
  ON public.user_journey_node_answers FOR ALL TO authenticated
  USING (public.can_access_user_journey_node(node_id))
  WITH CHECK (public.can_access_user_journey_node(node_id));

CREATE POLICY "workspace members can view user journey comments"
  ON public.user_journey_comments FOR SELECT TO authenticated
  USING (public.can_access_user_journey(user_journey_id));

CREATE POLICY "workspace members can create user journey comments"
  ON public.user_journey_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_user_journey(user_journey_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can update own user journey comments"
  ON public.user_journey_comments FOR UPDATE TO authenticated
  USING (public.can_access_user_journey(user_journey_id) AND auth.uid() = user_id)
  WITH CHECK (public.can_access_user_journey(user_journey_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can delete own user journey comments"
  ON public.user_journey_comments FOR DELETE TO authenticated
  USING (public.can_access_user_journey(user_journey_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can manage law firm user journeys"
  ON public.law_firm_user_journeys FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.law_firms lf
      WHERE lf.id = law_firm_id AND public.is_workspace_member(lf.workspace_id)
    )
    AND public.can_access_user_journey(user_journey_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.law_firms lf
      WHERE lf.id = law_firm_id AND public.is_workspace_member(lf.workspace_id)
    )
    AND public.can_access_user_journey(user_journey_id)
  );

-- ---------------------------------------------------------------------------
-- User story / asset / example junction & comment tables
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can manage user story roles"
  ON public.user_story_roles FOR ALL TO authenticated
  USING (public.can_access_user_story(user_story_id))
  WITH CHECK (public.can_access_user_story(user_story_id));

CREATE POLICY "workspace members can view user story comments"
  ON public.user_story_comments FOR SELECT TO authenticated
  USING (public.can_access_user_story(user_story_id));

CREATE POLICY "workspace members can create user story comments"
  ON public.user_story_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_user_story(user_story_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can update own user story comments"
  ON public.user_story_comments FOR UPDATE TO authenticated
  USING (public.can_access_user_story(user_story_id) AND auth.uid() = user_id)
  WITH CHECK (public.can_access_user_story(user_story_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can delete own user story comments"
  ON public.user_story_comments FOR DELETE TO authenticated
  USING (public.can_access_user_story(user_story_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can view asset comments"
  ON public.asset_comments FOR SELECT TO authenticated
  USING (public.can_access_asset(asset_id));

CREATE POLICY "workspace members can create asset comments"
  ON public.asset_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_asset(asset_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can update own asset comments"
  ON public.asset_comments FOR UPDATE TO authenticated
  USING (public.can_access_asset(asset_id) AND auth.uid() = user_id)
  WITH CHECK (public.can_access_asset(asset_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can delete own asset comments"
  ON public.asset_comments FOR DELETE TO authenticated
  USING (public.can_access_asset(asset_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can manage asset user stories"
  ON public.asset_user_stories FOR ALL TO authenticated
  USING (public.can_access_asset(asset_id) AND public.can_access_user_story(user_story_id))
  WITH CHECK (public.can_access_asset(asset_id) AND public.can_access_user_story(user_story_id));

CREATE POLICY "workspace members can manage asset research notes"
  ON public.asset_research_notes FOR ALL TO authenticated
  USING (public.can_access_asset(asset_id) AND public.can_access_research_note(research_note_id))
  WITH CHECK (public.can_access_asset(asset_id) AND public.can_access_research_note(research_note_id));

CREATE POLICY "workspace members can manage example user roles"
  ON public.example_user_roles FOR ALL TO authenticated
  USING (public.can_access_example(example_id))
  WITH CHECK (public.can_access_example(example_id));

CREATE POLICY "workspace members can view example comments"
  ON public.example_comments FOR SELECT TO authenticated
  USING (public.can_access_example(example_id));

CREATE POLICY "workspace members can create example comments"
  ON public.example_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_example(example_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can update own example comments"
  ON public.example_comments FOR UPDATE TO authenticated
  USING (public.can_access_example(example_id) AND auth.uid() = user_id)
  WITH CHECK (public.can_access_example(example_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can delete own example comments"
  ON public.example_comments FOR DELETE TO authenticated
  USING (public.can_access_example(example_id) AND auth.uid() = user_id);

CREATE POLICY "workspace members can manage note links"
  ON public.note_links FOR ALL TO authenticated
  USING (public.can_access_research_note(research_note_id))
  WITH CHECK (public.can_access_research_note(research_note_id));

CREATE POLICY "workspace members can manage research note stakeholders"
  ON public.research_note_stakeholders FOR ALL TO authenticated
  USING (public.can_access_research_note(research_note_id))
  WITH CHECK (public.can_access_research_note(research_note_id));

-- ---------------------------------------------------------------------------
-- Theme junction tables
-- ---------------------------------------------------------------------------

CREATE POLICY "workspace members can manage theme user stories"
  ON public.theme_user_stories FOR ALL TO authenticated
  USING (public.can_access_theme(theme_id) AND public.can_access_user_story(user_story_id))
  WITH CHECK (public.can_access_theme(theme_id) AND public.can_access_user_story(user_story_id));

CREATE POLICY "workspace members can manage theme user journeys"
  ON public.theme_user_journeys FOR ALL TO authenticated
  USING (public.can_access_theme(theme_id) AND public.can_access_user_journey(user_journey_id))
  WITH CHECK (public.can_access_theme(theme_id) AND public.can_access_user_journey(user_journey_id));

CREATE POLICY "workspace members can manage theme research notes"
  ON public.theme_research_notes FOR ALL TO authenticated
  USING (public.can_access_theme(theme_id) AND public.can_access_research_note(research_note_id))
  WITH CHECK (public.can_access_theme(theme_id) AND public.can_access_research_note(research_note_id));

CREATE POLICY "workspace members can manage theme assets"
  ON public.theme_assets FOR ALL TO authenticated
  USING (public.can_access_theme(theme_id) AND public.can_access_asset(asset_id))
  WITH CHECK (public.can_access_theme(theme_id) AND public.can_access_asset(asset_id));
