/*
  # Team Members Functionality Schema

  1. New Tables
    - `workspace_users` - Links users to workspaces with roles
    - Updates to existing tables to support multi-user access

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace-based access control
    - Users can only see data from workspaces they belong to

  3. Changes
    - Add proper foreign key relationships
    - Add indexes for performance
    - Add role-based access policies
*/

-- Create workspace_users table for team management
CREATE TABLE IF NOT EXISTS workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS on workspace_users
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

-- Update existing tables to ensure proper RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users" ON stakeholders;
DROP POLICY IF EXISTS "Allow authenticated users" ON research_notes;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can view stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can manage stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can view research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can manage research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can view workspace members in their workspaces" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can manage workspace users" ON workspace_users;

-- Workspace policies - users can only access workspaces they belong to
CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update workspaces they own or admin"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Projects policies - users can access projects in their workspaces
CREATE POLICY "Users can view projects in their workspaces"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage projects in their workspaces"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Stakeholders policies
CREATE POLICY "Users can view stakeholders in their workspaces"
  ON stakeholders
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage stakeholders in their workspaces"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Research notes policies
CREATE POLICY "Users can view research notes in their workspaces"
  ON research_notes
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

CREATE POLICY "Users can manage research notes in their workspaces"
  ON research_notes
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );

-- Workspace users policies
CREATE POLICY "Users can view workspace members in their workspaces"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and admins can manage workspace users"
  ON workspace_users
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND status = 'active'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id ON workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_workspace_id ON stakeholders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_research_notes_project_id ON research_notes(project_id);

-- Function to automatically add workspace creator as owner
CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_users (workspace_id, user_id, user_email, role, status)
  VALUES (
    NEW.id, 
    NEW.created_by, 
    (SELECT email FROM auth.users WHERE id = NEW.created_by),
    'owner',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add workspace owner
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_workspace_owner();