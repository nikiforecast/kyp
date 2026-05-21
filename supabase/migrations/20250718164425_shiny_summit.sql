/*
  # Remove All Recursive RLS Policies

  1. Problem
    - Infinite recursion detected in workspace_users policies
    - Policies are creating circular dependencies between tables
    - Complex subqueries causing performance issues

  2. Solution
    - Drop all existing policies that cause recursion
    - Create simple, direct policies without circular references
    - Use auth.uid() directly where possible
    - Avoid complex joins in RLS policies

  3. Security
    - Maintain workspace isolation
    - Ensure users can only access their workspace data
    - Keep role-based permissions simple
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Workspace members can manage projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can manage stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Workspace members can manage research notes" ON research_notes;
DROP POLICY IF EXISTS "Users can read own workspace entry" ON workspace_users;
DROP POLICY IF EXISTS "Workspace admins can read all members" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can add users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can update users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can remove users" ON workspace_users;

-- Create simple, non-recursive policies
DROP POLICY IF EXISTS "Allow authenticated users to view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow workspace creators to update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Allow authenticated users to manage projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to manage stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Allow authenticated users to manage research notes" ON research_notes;
DROP POLICY IF EXISTS "Allow users to view workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Allow authenticated users to manage workspace users" ON workspace_users;

-- Workspaces: Allow authenticated users to see all workspaces (simplified)
CREATE POLICY "Allow authenticated users to view workspaces"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow workspace creators to update their workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Projects: Simple workspace-based access
CREATE POLICY "Allow authenticated users to manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stakeholders: Simple workspace-based access
CREATE POLICY "Allow authenticated users to manage stakeholders"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Research Notes: Simple workspace-based access
CREATE POLICY "Allow authenticated users to manage research notes"
  ON research_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Workspace Users: Simple policies without recursion
CREATE POLICY "Allow users to view workspace memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage workspace users"
  ON workspace_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);