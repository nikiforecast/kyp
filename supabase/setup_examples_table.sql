-- Setup Examples Content Type
-- Run this script in your Supabase SQL Editor to create the Examples table

-- Create examples table
CREATE TABLE IF NOT EXISTS examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor text NOT NULL,
  goal text NOT NULL,
  entry_point text NOT NULL,
  actions text NOT NULL,
  error text NOT NULL,
  outcome text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create example_user_roles junction table for linking examples to predefined user roles
CREATE TABLE IF NOT EXISTS example_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid NOT NULL REFERENCES examples(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(example_id, user_role_id)
);

-- Enable Row Level Security
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE example_user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for examples table
-- Users can view examples from projects in their workspaces
CREATE POLICY "Users can view examples in their workspaces"
  ON examples
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );

-- Users can create examples in projects in their workspaces
CREATE POLICY "Users can create examples in their workspaces"
  ON examples
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Users can update examples they created in their workspaces
CREATE POLICY "Users can update examples they created in their workspaces"
  ON examples
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
    AND created_by = auth.uid()
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Users can delete examples they created in their workspaces
CREATE POLICY "Users can delete examples they created in their workspaces"
  ON examples
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Create RLS policies for example_user_roles table
-- Users can view example-user_role associations in their workspaces
CREATE POLICY "Users can view example user role associations in their workspaces"
  ON example_user_roles
  FOR SELECT
  TO authenticated
  USING (
    example_id IN (
      SELECT e.id 
      FROM examples e
      JOIN projects p ON e.project_id = p.id
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );

-- Users can manage example-user_role associations in their workspaces
CREATE POLICY "Users can manage example user role associations in their workspaces"
  ON example_user_roles
  FOR ALL
  TO authenticated
  USING (
    example_id IN (
      SELECT e.id 
      FROM examples e
      JOIN projects p ON e.project_id = p.id
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  )
  WITH CHECK (
    example_id IN (
      SELECT e.id 
      FROM examples e
      JOIN projects p ON e.project_id = p.id
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_examples_project_id ON examples(project_id);
CREATE INDEX IF NOT EXISTS idx_examples_created_by ON examples(created_by);
CREATE INDEX IF NOT EXISTS idx_examples_created_at ON examples(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_examples_actor ON examples(actor);

CREATE INDEX IF NOT EXISTS idx_example_user_roles_example_id ON example_user_roles(example_id);
CREATE INDEX IF NOT EXISTS idx_example_user_roles_user_role_id ON example_user_roles(user_role_id);

-- Create composite indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_examples_project_created_at ON examples(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_examples_project_actor ON examples(project_id, actor);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_examples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_examples_updated
  BEFORE UPDATE ON examples
  FOR EACH ROW
  EXECUTE FUNCTION update_examples_updated_at();

-- Verify the tables were created successfully
SELECT 'Examples table created successfully' as status;
SELECT 'example_user_roles table created successfully' as status;
SELECT 'All indexes and policies created successfully' as status;

-- Check if tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('examples', 'example_user_roles')
ORDER BY table_name;
