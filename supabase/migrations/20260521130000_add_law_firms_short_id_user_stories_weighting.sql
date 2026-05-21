/*
  Add columns the app expects but were never migrated:
  - law_firms.short_id (used in lawFirmService URLs)
  - user_stories.weighting (used for drag-and-drop ordering)
  Re-apply workspace_users SELECT policy (20260521120000 may have been marked applied without running).
*/

-- law_firms.short_id
CREATE SEQUENCE IF NOT EXISTS law_firms_short_id_seq START 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'law_firms' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE law_firms ADD COLUMN short_id integer UNIQUE DEFAULT nextval('law_firms_short_id_seq');
  END IF;
END $$;

UPDATE law_firms SET short_id = nextval('law_firms_short_id_seq') WHERE short_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'law_firms' AND column_name = 'short_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE law_firms ALTER COLUMN short_id SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_law_firms_short_id ON law_firms(short_id);

-- user_stories.weighting (nullable; stories without weight sort after weighted ones in app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_stories' AND column_name = 'weighting'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN weighting integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_stories_weighting ON user_stories(project_id, weighting);

-- workspace_users: fix SELECT policy that references auth.users
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON public.workspace_users;
DROP POLICY IF EXISTS "Allow users to view workspace memberships" ON public.workspace_users;

CREATE POLICY "Allow users to view workspace memberships"
  ON public.workspace_users
  FOR SELECT
  TO authenticated
  USING (true);
