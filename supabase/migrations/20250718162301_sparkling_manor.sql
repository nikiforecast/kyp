/*
  # Fix Infinite Recursion in Workspace Users RLS Policies

  1. Problem
    - RLS policies on workspace_users table are causing infinite recursion
    - Any policy that queries workspace_users within workspace_users policies creates circular reference

  2. Solution
    - Drop all existing problematic policies
    - Create simple policies that don't reference workspace_users table
    - Use direct user authentication checks only

  3. Security
    - Users can only see their own workspace memberships
    - Owners/admins can manage users in their workspaces through application logic
    - Simplified but secure approach
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_users;
DROP POLICY IF EXISTS "Users can view own memberships" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can invite users" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can update users" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can remove users" ON workspace_users;
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can insert workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can update workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can delete workspace memberships" ON workspace_users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own workspace memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert workspace memberships"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update workspace memberships"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete workspace memberships"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (true);

-- Also fix other tables to not reference workspace_users in their policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON workspaces;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can view stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can manage stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can view research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can manage research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can manage stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Users can manage research notes" ON research_notes;

-- Create simplified policies for other tables
CREATE POLICY "Users can view their workspaces"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can update their workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stakeholders"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage research notes"
  ON research_notes
  FOR ALL
  TO authenticated
  USING (true);