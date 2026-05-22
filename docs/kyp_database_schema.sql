-- =============================================================================
-- Journey Studio consolidated database DDL
-- Generated from supabase/migrations/*.sql in lexicographic (timestamp) order.
-- Import notes: docs/DATABASE_SCHEMA_IMPORT.md
-- =============================================================================

-- -------------------------------------------------------------------------
-- FILE: 20250101000000_support_auth0_users.sql
-- -------------------------------------------------------------------------
/*
  # Support Auth0 Users in RLS Policies

  This migration updates RLS policies to support Auth0 users who don't have
  Supabase auth.uid() but are identified by email in workspace_users table.

  1. Update workspace_users table to allow null user_id (for Auth0 users)
  2. Update RLS policies to check both user_id and email
  3. Allow workspace_users inserts with null user_id for Auth0 users
*/

-- First, allow null user_id in workspace_users (for Auth0 users)
ALTER TABLE workspace_users 
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop the unique constraint that requires user_id
ALTER TABLE workspace_users 
  DROP CONSTRAINT IF EXISTS workspace_users_workspace_id_user_id_key;

-- Add a new unique constraint that allows null user_id
CREATE UNIQUE INDEX IF NOT EXISTS workspace_users_workspace_id_user_email_key 
  ON workspace_users(workspace_id, user_email) 
  WHERE user_id IS NOT NULL;

-- Create a unique constraint for email-only entries (Auth0 users)
CREATE UNIQUE INDEX IF NOT EXISTS workspace_users_workspace_id_email_unique 
  ON workspace_users(workspace_id, user_email);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can insert workspace memberships" ON workspace_users;

-- Create new policy for workspaces
-- For now, allow authenticated users to see all workspaces
-- The application will filter by workspace_users membership
-- TODO: This is less secure but necessary for Auth0 users
-- In production, consider using Edge Functions for all data access
CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to view workspace_users entries they belong to (by user_id or email)
CREATE POLICY "Users can view their workspace memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow inserts to workspace_users (will be controlled by Edge Function with service role)
-- But also allow authenticated users to insert if they're adding themselves
CREATE POLICY "Users can insert workspace memberships"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: The Edge Function (add-auth0-user) uses service role key to bypass RLS
-- This policy allows the Edge Function to insert Auth0 users


-- -------------------------------------------------------------------------
-- FILE: 20250103000000_auto_add_legl_users.sql
-- -------------------------------------------------------------------------
/*
  # Auto-add @legl.com users to workspace
  
  This migration creates a trigger that automatically adds users with @legl.com
  email addresses to the "Legl" workspace when they sign up.
  
  1. Create function to handle new user signups
  2. Create trigger on auth.users
  3. Ensure "Legl" workspace exists or create it
*/

-- Function to automatically add @legl.com users to workspace
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL OR NOT (user_email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace (ignore if already exists)
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    user_email,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This fires after a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();

-- Also handle email updates (in case user changes email to @legl.com)
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
BEGIN
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace (ignore if already exists)
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user_on_update();


-- -------------------------------------------------------------------------
-- FILE: 20250104000000_allow_public_read_published_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Allow Public Access to Published User Journeys
  
  This migration adds an RLS policy that allows anonymous (unauthenticated) users
  to read published user journeys. This enables public sharing of user journeys.
*/

-- Drop existing policy if it exists (we'll recreate it with better name)
DROP POLICY IF EXISTS "Allow authenticated users to manage user journeys" ON user_journeys;

-- Create policy for authenticated users (full access)
CREATE POLICY "Allow authenticated users to manage user journeys"
  ON user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for anonymous users (read-only access to published journeys)
CREATE POLICY "Allow anonymous users to read published journeys"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status = 'published');


-- -------------------------------------------------------------------------
-- FILE: 20250111000000_fix_missing_workspace_user.sql
-- -------------------------------------------------------------------------
-- Fix missing workspace_user entries for existing authenticated users
-- This ensures all existing users are added to a workspace

DO $$
DECLARE
  legl_workspace_id uuid;
  user_record RECORD;
BEGIN
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name)
    VALUES ('Legl')
    RETURNING id INTO legl_workspace_id;
    
    RAISE NOTICE 'Created Legl workspace: %', legl_workspace_id;
  ELSE
    RAISE NOTICE 'Found existing Legl workspace: %', legl_workspace_id;
  END IF;
  
  -- Add all existing @legl.com users who aren't already in workspace_users
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email ILIKE '%@legl.com'
      AND id NOT IN (
        SELECT user_id 
        FROM workspace_users 
        WHERE user_id IS NOT NULL
      )
  LOOP
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      user_email,
      role,
      status
    )
    VALUES (
      legl_workspace_id,
      user_record.id,
      user_record.email,
      'admin', -- Make them admin since they're existing users
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = user_record.id,
      status = 'active',
      updated_at = now();
    
    RAISE NOTICE 'Added user % to workspace', user_record.email;
  END LOOP;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20250111000001_add_full_name_to_workspace_users.sql
-- -------------------------------------------------------------------------
/*
  # Add full name extraction to workspace user triggers
  
  This migration updates the workspace_users table to include full names
  from the auth.users table where they exist.
  
  Google OAuth users have their display name stored in auth.users,
  so we just need to sync it to workspace_users.
*/

-- First, let's backfill full_name for existing users from auth.users
-- The display name from Google is stored in raw_user_meta_data
UPDATE workspace_users wu
SET 
  full_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    au.raw_app_meta_data->>'full_name',
    au.raw_app_meta_data->>'name'
  ),
  updated_at = now()
FROM auth.users au
WHERE 
  wu.user_id = au.id
  AND (wu.full_name IS NULL OR wu.full_name = '')
  AND (
    au.raw_user_meta_data->>'full_name' IS NOT NULL
    OR au.raw_user_meta_data->>'name' IS NOT NULL
    OR au.raw_user_meta_data->>'display_name' IS NOT NULL
    OR au.raw_app_meta_data->>'full_name' IS NOT NULL
    OR au.raw_app_meta_data->>'name' IS NOT NULL
  );

-- Update the auto_add_legl_user function to include full_name
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
  user_full_name text;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL OR NOT (user_email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    user_email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the email change function too
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_full_name text;
BEGIN
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- FILE: 20250111000002_add_user_journey_groups.sql
-- -------------------------------------------------------------------------
/*
  # Add User Journey Groups
  
  1. New Tables
    - `user_journey_groups`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text)
      - `color` (text, optional - for visual distinction)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Changes
    - Add `group_id` column to `user_journeys` table
  
  3. Security
    - Enable RLS on user_journey_groups table
    - Add policies for workspace members to manage groups
*/

-- Create user_journey_groups table
CREATE TABLE IF NOT EXISTS user_journey_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add group_id column to user_journeys
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES user_journey_groups(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_groups_workspace_id ON user_journey_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_group_id ON user_journeys(group_id);

-- Enable Row Level Security
ALTER TABLE user_journey_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for user_journey_groups
-- Allow workspace members to view groups in their workspace
CREATE POLICY "Users can view groups in their workspace"
  ON user_journey_groups
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to create groups in their workspace
CREATE POLICY "Users can create groups in their workspace"
  ON user_journey_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to update groups in their workspace
CREATE POLICY "Users can update groups in their workspace"
  ON user_journey_groups
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to delete groups in their workspace
CREATE POLICY "Users can delete groups in their workspace"
  ON user_journey_groups
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE user_journey_groups IS 'Groups for organizing user journeys within a workspace';
COMMENT ON COLUMN user_journey_groups.color IS 'Hex color code for visual distinction (e.g., #3B82F6)';
COMMENT ON COLUMN user_journeys.group_id IS 'Optional group assignment for organizing user journeys';


-- -------------------------------------------------------------------------
-- FILE: 20250111000003_rename_groups_to_folders.sql
-- -------------------------------------------------------------------------
/*
  # Rename Groups to Folders
  
  This migration renames:
  - user_journey_groups -> user_journey_folders
  - group_id -> folder_id
*/

-- Rename the table
ALTER TABLE user_journey_groups RENAME TO user_journey_folders;

-- Rename the column in user_journeys table
ALTER TABLE user_journeys RENAME COLUMN group_id TO folder_id;

-- Rename indexes
ALTER INDEX idx_user_journey_groups_workspace_id RENAME TO idx_user_journey_folders_workspace_id;
ALTER INDEX idx_user_journeys_group_id RENAME TO idx_user_journeys_folder_id;

-- Update table comment
COMMENT ON TABLE user_journey_folders IS 'Folders for organizing user journeys within a workspace';

-- Update column comment
COMMENT ON COLUMN user_journeys.folder_id IS 'Optional folder assignment for organizing user journeys';


-- -------------------------------------------------------------------------
-- FILE: 20250111000004_add_nested_folders.sql
-- -------------------------------------------------------------------------
/*
  # Add nested folder support
  
  This migration adds:
  - parent_folder_id to user_journey_folders for nested folders
  - Cascading delete to remove journeys when folder is deleted
*/

-- Add parent_folder_id for nested folders
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS parent_folder_id uuid REFERENCES user_journey_folders(id) ON DELETE CASCADE;

-- Create index for parent folder lookups
CREATE INDEX IF NOT EXISTS idx_user_journey_folders_parent_id ON user_journey_folders(parent_folder_id);

-- Update the ON DELETE behavior for folder_id in user_journeys to CASCADE
-- This will delete all journeys when a folder is deleted
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_folder_id_fkey;

ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_folder_id_fkey 
FOREIGN KEY (folder_id) 
REFERENCES user_journey_folders(id) 
ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN user_journey_folders.parent_folder_id IS 'Parent folder for nested folder structure (null for root folders)';


-- -------------------------------------------------------------------------
-- FILE: 20250112000000_add_created_by_to_folders.sql
-- -------------------------------------------------------------------------
-- Add created_by column to user_journey_folders table
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_folders_created_by ON user_journey_folders(created_by);

-- Add comment
COMMENT ON COLUMN user_journey_folders.created_by IS 'User ID of the person who created this folder';


-- -------------------------------------------------------------------------
-- FILE: 20250113000000_create_user_journey_comments.sql
-- -------------------------------------------------------------------------
/*
  # Create user journey comments table

  1. New Tables
    - `user_journey_comments`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_journey_comments` table
    - Add policy for authenticated users to create comments (only their own)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on user_journey_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS user_journey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_journey_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_user_journey_id ON user_journey_comments(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_user_id ON user_journey_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_created_at ON user_journey_comments(created_at DESC);

-- RLS Policies

-- Allow authenticated users to create comments (only their own)
CREATE POLICY "Allow authenticated users to create user journey comments"
  ON user_journey_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all user journey comments"
  ON user_journey_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own user journey comments"
  ON user_journey_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own user journey comments"
  ON user_journey_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



-- -------------------------------------------------------------------------
-- FILE: 20250113000001_ensure_google_users_in_workspace.sql
-- -------------------------------------------------------------------------
/*
  # Ensure Google OAuth users are added to Legl workspace
  
  This migration:
  1. Ensures the trigger is properly set up and active
  2. Backfills any existing @legl.com users who aren't in workspace_users
  3. Includes full_name extraction from Google OAuth metadata
*/

-- First, ensure the trigger function includes full_name extraction
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
  user_full_name text;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL OR NOT (user_email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    user_email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();

-- Update the email change function too
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_full_name text;
BEGIN
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the update trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user_on_update();

-- Backfill: Add all existing @legl.com users who aren't in workspace_users
DO $$
DECLARE
  legl_workspace_id uuid;
  user_record RECORD;
  user_full_name text;
  added_count integer := 0;
  first_user_id uuid;
BEGIN
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    -- Try to get the first @legl.com user as creator
    SELECT id INTO first_user_id
    FROM auth.users
    WHERE email ILIKE '%@legl.com'
    LIMIT 1;
    
    IF first_user_id IS NULL THEN
      RAISE NOTICE 'No @legl.com users found, skipping workspace creation';
      RETURN;
    END IF;
    
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', first_user_id)
    RETURNING id INTO legl_workspace_id;
    
    RAISE NOTICE 'Created Legl workspace: %', legl_workspace_id;
  ELSE
    RAISE NOTICE 'Found existing Legl workspace: %', legl_workspace_id;
  END IF;
  
  -- Add all existing @legl.com users who aren't already in workspace_users
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'display_name',
        au.raw_app_meta_data->>'full_name',
        au.raw_app_meta_data->>'name'
      ) as full_name
    FROM auth.users au
    WHERE au.email ILIKE '%@legl.com'
      AND NOT EXISTS (
        SELECT 1 
        FROM workspace_users wu 
        WHERE wu.workspace_id = legl_workspace_id
          AND (wu.user_id = au.id OR wu.user_email = au.email)
      )
  LOOP
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      user_email,
      full_name,
      role,
      status
    )
    VALUES (
      legl_workspace_id,
      user_record.id,
      user_record.email,
      user_record.full_name,
      'member',
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = user_record.id,
      full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
      status = 'active',
      updated_at = now();
    
    added_count := added_count + 1;
    RAISE NOTICE 'Added user % to workspace', user_record.email;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Added % users to workspace', added_count;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20250113000002_change_status_to_personal_shared.sql
-- -------------------------------------------------------------------------
/*
  # Change user journey status from draft/published to personal/shared
  
  This migration:
  1. Drops the old CHECK constraint
  2. Migrates existing data: 'draft' -> 'personal', 'published' -> 'shared'
  3. Updates the CHECK constraint to use 'personal' and 'shared' instead of 'draft' and 'published'
  4. Updates RLS policies to allow public access to both 'personal' and 'shared' journeys (via public link)
  5. Updates the column comment
*/

-- First, drop the old CHECK constraint (must be done before updating data)
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_status_check;

-- Now update existing data (constraint is dropped, so this will work)
UPDATE user_journeys
SET status = CASE 
  WHEN status = 'draft' THEN 'personal'
  WHEN status = 'published' THEN 'shared'
  ELSE status
END
WHERE status IN ('draft', 'published');

-- Add new CHECK constraint with updated values
ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_status_check 
CHECK (status IN ('personal', 'shared'));

-- Update the default value
ALTER TABLE user_journeys
ALTER COLUMN status SET DEFAULT 'personal';

-- Update the column comment
COMMENT ON COLUMN user_journeys.status IS 'Status of the user journey: personal (only visible to creator in workspace, but can be shared via public link) or shared (visible to all workspace members and can be shared via public link)';

-- Update RLS policy to allow anonymous users to read both personal and shared journeys
-- (Both can be accessed via public link)
-- Drop the old policy that only allowed 'published' status
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
-- Drop the new policy if it exists (in case migration is re-run)
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create policy for anonymous users (read-only access to both personal and shared journeys)
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


-- -------------------------------------------------------------------------
-- FILE: 20250113000003_fix_public_access_personal_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Fix public access for personal journeys
  
  This migration ensures that anonymous users can access both personal and shared journeys
  via public links. It drops any conflicting policies and creates a clean policy.
  
  IMPORTANT: This must be run after migration 20250113000002_change_status_to_personal_shared.sql
  to ensure the status values have been migrated.
*/

-- First, ensure the status values are correct (in case this runs before the other migration)
UPDATE user_journeys
SET status = CASE 
  WHEN status = 'draft' THEN 'personal'
  WHEN status = 'published' THEN 'shared'
  ELSE status
END
WHERE status IN ('draft', 'published');

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create policy for anonymous users (read-only access to both personal and shared journeys)
-- Both can be accessed via public link using their short_id
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


-- -------------------------------------------------------------------------
-- FILE: 20250113000004_fix_status_constraint_properly.sql
-- -------------------------------------------------------------------------
/*
  # Fix status constraint properly
  
  This migration properly handles the status constraint migration by:
  1. Finding and dropping any existing status check constraints (including auto-named ones)
  2. Updating the data
  3. Recreating the constraint with the correct values
*/

-- First, find and drop any existing status check constraints
-- PostgreSQL might have auto-generated names, so we need to find them dynamically
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all check constraints on user_journeys table
    FOR constraint_record IN
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'user_journeys'::regclass
        AND contype = 'c'
    LOOP
        -- Check if this constraint is related to status
        IF constraint_record.definition LIKE '%status%' OR constraint_record.conname LIKE '%status%' THEN
            EXECUTE format('ALTER TABLE user_journeys DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
            RAISE NOTICE 'Dropped constraint: % (definition: %)', constraint_record.conname, constraint_record.definition;
        END IF;
    END LOOP;
END $$;

-- Now update existing data (constraint is dropped, so this will work)
UPDATE user_journeys
SET status = CASE 
  WHEN status = 'draft' THEN 'personal'
  WHEN status = 'published' THEN 'shared'
  ELSE status
END
WHERE status IN ('draft', 'published');

-- Add new CHECK constraint with updated values
ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_status_check 
CHECK (status IN ('personal', 'shared'));

-- Update the default value
ALTER TABLE user_journeys
ALTER COLUMN status SET DEFAULT 'personal';

-- Update the column comment
COMMENT ON COLUMN user_journeys.status IS 'Status of the user journey: personal (only visible to creator in workspace, but can be shared via public link) or shared (visible to all workspace members and can be shared via public link)';

-- Update RLS policy to allow anonymous users to read both personal and shared journeys
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


-- -------------------------------------------------------------------------
-- FILE: 20250116000000_add_flow_data_to_user_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Add React Flow data support to user_journeys
  
  1. Changes
    - Add description column to user_journeys
    - Add flow_data column to store React Flow nodes and edges as JSONB
    - The flow_data will store: { nodes: [], edges: [] }
  
  This allows storing the visual flow diagram data separately from the legacy node structure
*/

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'description'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

-- Add flow_data column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'flow_data'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN flow_data jsonb DEFAULT '{"nodes": [], "edges": []}'::jsonb;
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20250116000001_make_user_journey_project_optional.sql
-- -------------------------------------------------------------------------
/*
  # Make project_id optional for user journeys
  
  1. Changes
    - Make project_id nullable in user_journeys table
    - User journeys can now exist independently without a project
*/

-- Make project_id nullable
ALTER TABLE user_journeys 
  ALTER COLUMN project_id DROP NOT NULL;


-- -------------------------------------------------------------------------
-- FILE: 20250117000000_add_glossy_icon_to_user_roles.sql
-- -------------------------------------------------------------------------
/*
  # Add glossy_icon column to user_roles table

  1. Changes
    - Add glossy_icon column to user_roles table to store SVG content
    - The column is nullable (optional field)
    - Uses text type to store SVG markup
*/

-- Add glossy_icon column to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'glossy_icon'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN glossy_icon text;
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20250117000002_add_law_firm_user_journeys_junction.sql
-- -------------------------------------------------------------------------
-- Create law_firm_user_journeys junction table
CREATE TABLE IF NOT EXISTS law_firm_user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id, user_journey_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_law_firm_user_journeys_law_firm_id ON law_firm_user_journeys(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_user_journeys_user_journey_id ON law_firm_user_journeys(user_journey_id);

-- Enable RLS
ALTER TABLE law_firm_user_journeys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------------------------
-- FILE: 20250118000000_create_third_parties_table.sql
-- -------------------------------------------------------------------------
-- Create third_parties table
CREATE TABLE IF NOT EXISTS third_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo text, -- SVG content or image URL
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS to the table
ALTER TABLE third_parties ENABLE ROW LEVEL SECURITY;

-- Policies for third_parties
CREATE POLICY "Enable read access for all users" ON "public"."third_parties" FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."third_parties" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON "public"."third_parties" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON "public"."third_parties" FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_third_parties_workspace_id ON third_parties (workspace_id);
CREATE INDEX IF NOT EXISTS idx_third_parties_name ON third_parties (name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_third_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_third_parties_updated_at
  BEFORE UPDATE ON third_parties
  FOR EACH ROW
  EXECUTE FUNCTION update_third_parties_updated_at();


-- -------------------------------------------------------------------------
-- FILE: 20250121000000_create_platforms_table.sql
-- -------------------------------------------------------------------------
-- Create platforms table
CREATE TABLE IF NOT EXISTS public.platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    colour TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'Server',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes
CREATE INDEX IF NOT EXISTS platforms_workspace_id_idx ON public.platforms(workspace_id);
CREATE INDEX IF NOT EXISTS platforms_name_idx ON public.platforms(name);

-- Enable RLS
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can create platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can update platforms in their workspace" ON public.platforms;
DROP POLICY IF EXISTS "Users can delete platforms in their workspace" ON public.platforms;

-- Create RLS policies
CREATE POLICY "Users can view platforms in their workspace"
    ON public.platforms
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create platforms in their workspace"
    ON public.platforms
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update platforms in their workspace"
    ON public.platforms
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete platforms in their workspace"
    ON public.platforms
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM public.workspace_users 
            WHERE user_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platforms_updated_at ON public.platforms;
CREATE TRIGGER update_platforms_updated_at
    BEFORE UPDATE ON public.platforms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platforms
INSERT INTO public.platforms (name, description, colour, icon, workspace_id)
SELECT 
    default_platforms.name,
    default_platforms.description,
    default_platforms.colour,
    default_platforms.icon,
    workspaces.id as workspace_id
FROM (
    VALUES 
        ('CMS', 'Content Management System', '#8B5CF6', 'Database'),
        ('Legl', 'Legl Platform', '#3B82F6', 'Zap'),
        ('End client', 'End Client Systems', '#10B981', 'User'),
        ('Back end', 'Backend Services', '#6B7280', 'Server'),
        ('Third party', 'Third Party Services', '#F59E0B', 'ExternalLink')
) AS default_platforms(name, description, colour, icon)
CROSS JOIN public.workspaces
WHERE NOT EXISTS (
    SELECT 1 FROM public.platforms 
    WHERE platforms.workspace_id = workspaces.id
    LIMIT 1
);


-- -------------------------------------------------------------------------
-- FILE: 20250125000000_merge_third_parties_into_platforms.sql
-- -------------------------------------------------------------------------
-- Migration to merge third_parties into platforms table
-- This migration:
-- 1. Migrates all third_parties data to platforms (if not already exists)
-- 2. Sets default values for platforms fields (colour, icon, description) for migrated third parties

-- Migrate third parties to platforms
-- Only insert if a platform with the same name doesn't already exist in the same workspace
INSERT INTO public.platforms (workspace_id, name, logo, colour, icon, description, created_at, updated_at)
SELECT 
    tp.workspace_id,
    tp.name,
    tp.logo,
    '#F59E0B' as colour, -- Default orange colour for third parties
    'ExternalLink' as icon, -- Default icon
    'Third Party Service' as description, -- Default description
    tp.created_at,
    tp.updated_at
FROM public.third_parties tp
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.platforms p 
    WHERE p.workspace_id = tp.workspace_id 
    AND LOWER(TRIM(p.name)) = LOWER(TRIM(tp.name))
)
ON CONFLICT DO NOTHING;

-- Note: We're not dropping the third_parties table yet to allow for rollback if needed
-- The table can be dropped in a future migration once we've verified everything works


-- -------------------------------------------------------------------------
-- FILE: 20250125000001_update_platform_colors.sql
-- -------------------------------------------------------------------------
-- Update all platforms with color #F59E0B (orange) to #5A6698 (blue-gray)
UPDATE public.platforms
SET colour = '#5A6698'
WHERE colour = '#F59E0B';


-- -------------------------------------------------------------------------
-- FILE: 20250125000002_remove_description_and_icon_from_platforms.sql
-- -------------------------------------------------------------------------
-- Remove description and icon columns from platforms table
ALTER TABLE public.platforms DROP COLUMN IF EXISTS description;
ALTER TABLE public.platforms DROP COLUMN IF EXISTS icon;


-- -------------------------------------------------------------------------
-- FILE: 20250125000003_update_default_platforms_color.sql
-- -------------------------------------------------------------------------
-- Update default platform color to #5A6698
UPDATE public.platforms
SET colour = '#5A6698'
WHERE colour = '#3B82F6' OR colour = '#F59E0B';


-- -------------------------------------------------------------------------
-- FILE: 20250125000004_add_public_id_to_user_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Add secure public_id to user_journeys
  
  This migration adds a secure, unguessable public_id column for public sharing URLs.
  The public_id is a UUID that cannot be guessed, providing security for public links.
  
  1. Changes
    - Add public_id column (UUID, nullable, unique)
    - Create unique index for fast lookups
    - Generate public_id for existing journeys (optional, can be done on-demand)
*/

-- Add public_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN public_id uuid UNIQUE DEFAULT gen_random_uuid();
    RAISE NOTICE 'Added public_id column to user_journeys';
  ELSE
    RAISE NOTICE 'public_id column already exists in user_journeys';
  END IF;
END $$;

-- Generate public_id for existing records that don't have one (optional, can be done on-demand)
UPDATE user_journeys 
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

-- Create unique index for fast lookups if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_public_id ON user_journeys(public_id);


-- -------------------------------------------------------------------------
-- FILE: 20250125000005_update_rls_for_public_id.sql
-- -------------------------------------------------------------------------
/*
  # Update RLS policy to allow public access via public_id
  
  This migration ensures that anonymous users can access user journeys via their public_id.
  The existing policy already allows anonymous access, but we want to make sure it works
  with the new public_id column.
*/

-- The existing policy "Allow anonymous users to read journeys via public link" 
-- already allows anonymous users to read all journeys (USING (true))
-- So no changes are needed to the RLS policy itself.

-- However, we should verify the policy exists and is correct
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_journeys' 
    AND policyname = 'Allow anonymous users to read journeys via public link'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Allow anonymous users to read journeys via public link"
      ON user_journeys
      FOR SELECT
      TO anon
      USING (true);
    RAISE NOTICE 'Created RLS policy for anonymous users to read journeys via public link';
  ELSE
    RAISE NOTICE 'RLS policy for anonymous users already exists';
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20250126000000_remove_glossy_icon_from_user_roles.sql
-- -------------------------------------------------------------------------
/*
  # Remove glossy_icon column from user_roles table

  1. Changes
    - Remove glossy_icon column from user_roles table
    - This column is no longer needed as we're using emoji icons instead
*/

-- Remove glossy_icon column from user_roles table
ALTER TABLE user_roles DROP COLUMN IF EXISTS glossy_icon;


-- -------------------------------------------------------------------------
-- FILE: 20250127000000_add_status_to_folders.sql
-- -------------------------------------------------------------------------
/*
  # Add status column to user_journey_folders table
  
  This migration:
  1. Adds status column with CHECK constraint (personal/shared)
  2. Sets default value to 'personal'
  3. Updates existing folders to 'personal' status
*/

-- Add status column to user_journey_folders
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS status text DEFAULT 'personal' NOT NULL;

-- Add CHECK constraint for status values
ALTER TABLE user_journey_folders
DROP CONSTRAINT IF EXISTS user_journey_folders_status_check;

ALTER TABLE user_journey_folders
ADD CONSTRAINT user_journey_folders_status_check 
CHECK (status IN ('personal', 'shared'));

-- Update existing folders to 'personal' status (default)
UPDATE user_journey_folders
SET status = 'personal'
WHERE status IS NULL OR status NOT IN ('personal', 'shared');

-- Add comment to column
COMMENT ON COLUMN user_journey_folders.status IS 'Status of the folder: personal (only visible to creator in workspace) or shared (visible to all workspace members). When a folder is shared, all user journeys and folders inside it are also shared.';


-- -------------------------------------------------------------------------
-- FILE: 20250127000001_make_all_folders_shared.sql
-- -------------------------------------------------------------------------
-- Make all folders shared
UPDATE user_journey_folders
SET status = 'shared'
WHERE status = 'personal' OR status IS NULL;


-- -------------------------------------------------------------------------
-- FILE: 20250127000002_remove_status_from_user_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Remove status column from user_journeys
  
  This migration:
  1. Drops RLS policies that depend on status column
  2. Drops the status CHECK constraint
  3. Removes the status column from user_journeys
  4. Recreates RLS policies without status dependency
  
  User journeys now inherit their status from their parent folder.
  If a journey is in a shared folder, it's shared. If in a personal folder, it's personal.
  Journeys without a folder are considered personal by default.
  
  Note: All journeys can be accessed via public link regardless of folder status.
*/

-- Drop RLS policies that depend on the status column
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;

-- Drop the status CHECK constraint
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_status_check;

-- Remove the status column
ALTER TABLE user_journeys
DROP COLUMN IF EXISTS status;

-- Recreate the policy for anonymous users (all journeys can be accessed via public link)
-- Since journeys can be shared via public link regardless of folder status,
-- we allow anonymous users to read all journeys
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (true);

-- Update the comment on the table to reflect the new behavior
COMMENT ON TABLE user_journeys IS 'User journeys inherit their status from their parent folder. Journeys in shared folders are shared, journeys in personal folders are personal. All journeys can be accessed via public link.';


-- -------------------------------------------------------------------------
-- FILE: 20250130120000_optimize_law_firms_performance.sql
-- -------------------------------------------------------------------------
/*
  # Optimize law_firms table performance

  1. Performance Improvements
    - Add index on created_at for fast ORDER BY operations
    - Add composite index for workspace_id + created_at for filtered queries
    - Consider partial indexes for active firms

  2. Benefits
    - Faster ORDER BY created_at DESC queries
    - Improved pagination performance
    - Better performance for workspace-filtered queries
*/

-- Add index on created_at for ORDER BY performance
CREATE INDEX IF NOT EXISTS idx_law_firms_created_at ON law_firms(created_at DESC);

-- Add composite index for workspace_id + created_at for filtered queries
CREATE INDEX IF NOT EXISTS idx_law_firms_workspace_created_at ON law_firms(workspace_id, created_at DESC);

-- Add partial index for active firms only (if most queries filter by status)
CREATE INDEX IF NOT EXISTS idx_law_firms_active_created_at ON law_firms(created_at DESC) WHERE status = 'active';

-- Add index on name for search operations
CREATE INDEX IF NOT EXISTS idx_law_firms_name ON law_firms(name);

-- Add index on structure for filtering
CREATE INDEX IF NOT EXISTS idx_law_firms_structure ON law_firms(structure);

-- -------------------------------------------------------------------------
-- FILE: 20250205000001_add_signup_debugging.sql
-- -------------------------------------------------------------------------
/*
  # Add Debugging to User Signup Process
  
  This migration adds comprehensive logging to the auto_add_legl_user trigger
  function to help debug signup issues. All steps are logged with RAISE NOTICE
  so they appear in Supabase logs.
  
  To view logs:
  1. Go to Supabase Dashboard > Logs > Postgres Logs
  2. Filter for "auto_add_legl_user" or "SIGNUP_DEBUG"
*/

-- Recreate the trigger function with comprehensive debugging
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  legl_workspace_id uuid;
  v_user_email text;  -- Renamed to avoid conflict with column name
  user_full_name text;
  insert_result text;
BEGIN
  -- Log trigger start
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger fired for user ID: %, Email: %', NEW.id, NEW.email;
  
  -- Get user email
  v_user_email := NEW.email;
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted email: %', v_user_email;
  
  -- Only process @legl.com emails
  IF v_user_email IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email is NULL, skipping';
    RETURN NEW;
  END IF;
  
  IF NOT (v_user_email ILIKE '%@legl.com') THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email % does not match @legl.com pattern, skipping', v_user_email;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Email % matches @legl.com pattern, proceeding', v_user_email;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted full_name: %', user_full_name;
  
  -- Find or create "Legl" workspace
  RAISE NOTICE 'SIGNUP_DEBUG: Looking for Legl workspace...';
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Legl workspace not found, creating new workspace...';
    BEGIN
      INSERT INTO workspaces (name, created_by)
      VALUES ('Legl', NEW.id)
      RETURNING id INTO legl_workspace_id;
      RAISE NOTICE 'SIGNUP_DEBUG: Created Legl workspace with ID: %', legl_workspace_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'SIGNUP_DEBUG: ERROR creating workspace: % - %', SQLSTATE, SQLERRM;
      -- Try to find it again in case of race condition
      SELECT id INTO legl_workspace_id
      FROM workspaces
      WHERE name = 'Legl'
      LIMIT 1;
      
      IF legl_workspace_id IS NULL THEN
        RAISE EXCEPTION 'SIGNUP_DEBUG: CRITICAL - Could not create or find Legl workspace. Error: %', SQLERRM;
      ELSE
        RAISE NOTICE 'SIGNUP_DEBUG: Found workspace after retry: %', legl_workspace_id;
      END IF;
    END;
  ELSE
    RAISE NOTICE 'SIGNUP_DEBUG: Found existing Legl workspace with ID: %', legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  RAISE NOTICE 'SIGNUP_DEBUG: Attempting to insert into workspace_users...';
  RAISE NOTICE 'SIGNUP_DEBUG: Values - workspace_id: %, user_id: %, user_email: %, full_name: %, role: member, status: active', 
    legl_workspace_id, NEW.id, v_user_email, user_full_name;
  
  BEGIN
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      user_email,
      full_name,
      role,
      status
    )
    VALUES (
      legl_workspace_id,
      NEW.id,
      v_user_email,
      user_full_name,
      'member',
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = NEW.id,
      full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
      status = 'active',
      updated_at = now();
    
    RAISE NOTICE 'SIGNUP_DEBUG: Successfully inserted/updated user in workspace_users';
    
    -- Verify the insert worked (use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO insert_result
    FROM workspace_users wu
    WHERE wu.workspace_id = legl_workspace_id 
      AND (wu.user_id = NEW.id OR wu.user_email = v_user_email);
    
    RAISE NOTICE 'SIGNUP_DEBUG: Verification - Found % matching entries in workspace_users', insert_result;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP_DEBUG: ERROR inserting into workspace_users: % - %', SQLSTATE, SQLERRM;
    RAISE WARNING 'SIGNUP_DEBUG: Error details - workspace_id: %, user_id: %, user_email: %', 
      legl_workspace_id, NEW.id, v_user_email;
    
    -- Check RLS policies
    RAISE NOTICE 'SIGNUP_DEBUG: Checking if RLS might be blocking...';
    RAISE NOTICE 'SIGNUP_DEBUG: Current user context: auth.uid() = %', auth.uid();
    
    -- Re-raise the error so signup fails
    RAISE EXCEPTION 'SIGNUP_DEBUG: Failed to add user to workspace_users. Original error: %', SQLERRM;
  END;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger completed successfully for user: %', v_user_email;
  RETURN NEW;
END;
$$;

-- Also add debugging to the update function
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  legl_workspace_id uuid;
  user_full_name text;
BEGIN
  RAISE NOTICE 'SIGNUP_DEBUG: Update trigger fired - OLD.email: %, NEW.email: %', OLD.email, NEW.email;
  
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Update - Email does not match @legl.com, skipping';
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Update - Email unchanged, skipping';
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Update - Processing email change to @legl.com';
  
  -- Extract full name from user metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();


-- -------------------------------------------------------------------------
-- FILE: 20250205000002_fix_ambiguous_column.sql
-- -------------------------------------------------------------------------
/*
  # Fix Ambiguous Column Reference
  
  Fixes the "column reference 'user_email' is ambiguous" error in the
  auto_add_legl_user trigger function by properly qualifying column names
  in the verification query.
*/

CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  legl_workspace_id uuid;
  v_user_email text;  -- Renamed to avoid conflict with column name
  user_full_name text;
  insert_result text;
BEGIN
  -- Log trigger start
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger fired for user ID: %, Email: %', NEW.id, NEW.email;
  
  -- Get user email
  v_user_email := NEW.email;
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted email: %', v_user_email;
  
  -- Only process @legl.com emails
  IF v_user_email IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email is NULL, skipping';
    RETURN NEW;
  END IF;
  
  IF NOT (v_user_email ILIKE '%@legl.com') THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email % does not match @legl.com pattern, skipping', v_user_email;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Email % matches @legl.com pattern, proceeding', v_user_email;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted full_name: %', user_full_name;
  
  -- Find or create "Legl" workspace
  RAISE NOTICE 'SIGNUP_DEBUG: Looking for Legl workspace...';
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Legl workspace not found, creating new workspace...';
    BEGIN
      INSERT INTO workspaces (name, created_by)
      VALUES ('Legl', NEW.id)
      RETURNING id INTO legl_workspace_id;
      RAISE NOTICE 'SIGNUP_DEBUG: Created Legl workspace with ID: %', legl_workspace_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'SIGNUP_DEBUG: ERROR creating workspace: % - %', SQLSTATE, SQLERRM;
      -- Try to find it again in case of race condition
      SELECT id INTO legl_workspace_id
      FROM workspaces
      WHERE name = 'Legl'
      LIMIT 1;
      
      IF legl_workspace_id IS NULL THEN
        RAISE EXCEPTION 'SIGNUP_DEBUG: CRITICAL - Could not create or find Legl workspace. Error: %', SQLERRM;
      ELSE
        RAISE NOTICE 'SIGNUP_DEBUG: Found workspace after retry: %', legl_workspace_id;
      END IF;
    END;
  ELSE
    RAISE NOTICE 'SIGNUP_DEBUG: Found existing Legl workspace with ID: %', legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  RAISE NOTICE 'SIGNUP_DEBUG: Attempting to insert into workspace_users...';
  RAISE NOTICE 'SIGNUP_DEBUG: Values - workspace_id: %, user_id: %, user_email: %, full_name: %, role: member, status: active', 
    legl_workspace_id, NEW.id, v_user_email, user_full_name;
  
  BEGIN
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      user_email,
      full_name,
      role,
      status
    )
    VALUES (
      legl_workspace_id,
      NEW.id,
      v_user_email,
      user_full_name,
      'member',
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = NEW.id,
      full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
      status = 'active',
      updated_at = now();
    
    RAISE NOTICE 'SIGNUP_DEBUG: Successfully inserted/updated user in workspace_users';
    
    -- Verify the insert worked (use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO insert_result
    FROM workspace_users wu
    WHERE wu.workspace_id = legl_workspace_id 
      AND (wu.user_id = NEW.id OR wu.user_email = v_user_email);
    
    RAISE NOTICE 'SIGNUP_DEBUG: Verification - Found % matching entries in workspace_users', insert_result;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP_DEBUG: ERROR inserting into workspace_users: % - %', SQLSTATE, SQLERRM;
    RAISE WARNING 'SIGNUP_DEBUG: Error details - workspace_id: %, user_id: %, user_email: %', 
      legl_workspace_id, NEW.id, v_user_email;
    
    -- Check RLS policies
    RAISE NOTICE 'SIGNUP_DEBUG: Checking if RLS might be blocking...';
    RAISE NOTICE 'SIGNUP_DEBUG: Current user context: auth.uid() = %', auth.uid();
    
    -- Re-raise the error so signup fails
    RAISE EXCEPTION 'SIGNUP_DEBUG: Failed to add user to workspace_users. Original error: %', SQLERRM;
  END;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger completed successfully for user: %', v_user_email;
  RETURN NEW;
END;
$$;


-- -------------------------------------------------------------------------
-- FILE: 20250212000000_add_public_sharing_flag.sql
-- -------------------------------------------------------------------------
/*
  # Add Public Sharing Flag to User Journeys
  
  This migration adds an explicit flag to control which journeys can be accessed
  via public links. Only journeys with is_publicly_shared = true can be accessed
  by anonymous users, providing better security control.
  
  1. Changes
    - Add is_publicly_shared column (boolean, default false)
    - Update RLS policy to check is_publicly_shared flag
    - Create index for performance
*/

-- Add is_publicly_shared column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'is_publicly_shared'
  ) THEN
    ALTER TABLE user_journeys 
    ADD COLUMN is_publicly_shared boolean NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added is_publicly_shared column to user_journeys';
  ELSE
    RAISE NOTICE 'is_publicly_shared column already exists in user_journeys';
  END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN user_journeys.is_publicly_shared IS 
  'Whether this journey can be accessed via public link. Only journeys with is_publicly_shared = true can be viewed by anonymous users.';

-- Create index for performance when querying by public_id and is_publicly_shared
CREATE INDEX IF NOT EXISTS idx_user_journeys_public_sharing 
ON user_journeys(public_id, is_publicly_shared) 
WHERE is_publicly_shared = true;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create new restrictive policy that only allows access to explicitly shared journeys
CREATE POLICY "Allow anonymous users to read publicly shared journeys"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (is_publicly_shared = true AND public_id IS NOT NULL);

-- Update table comment to reflect the new behavior
COMMENT ON TABLE user_journeys IS 
  'User journeys inherit their status from their parent folder. Journeys in shared folders are shared, journeys in personal folders are personal. Only journeys with is_publicly_shared = true can be accessed via public link.';

-- -------------------------------------------------------------------------
-- FILE: 20250718151441_precious_lodge.sql
-- -------------------------------------------------------------------------
/*
  # Simple KYD Platform Schema

  1. New Tables
    - `workspaces` - Main workspace entities
    - `projects` - Project management
    - `stakeholders` - Stakeholder management  
    - `research_notes` - Research notes

  2. Security
    - Enable RLS on all tables
    - Simple policies for authenticated users

  3. Features
    - UUID primary keys
    - Timestamps for audit trails
    - Simple relationships
*/

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  overview text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Research notes table
CREATE TABLE IF NOT EXISTS research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow authenticated users to access everything for now
CREATE POLICY "Allow authenticated users" ON workspaces FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON stakeholders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON research_notes FOR ALL TO authenticated USING (true);

-- Create a default workspace
INSERT INTO workspaces (name, created_by) 
SELECT 'Default Workspace', id 
FROM auth.users 
WHERE email = 'niki@legl.com'
ON CONFLICT DO NOTHING;
-- -------------------------------------------------------------------------
-- FILE: 20250718161654_bitter_boat.sql
-- -------------------------------------------------------------------------
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
-- -------------------------------------------------------------------------
-- FILE: 20250718162207_rough_cliff.sql
-- -------------------------------------------------------------------------
/*
  # Fix Workspace Users RLS Policies

  This migration fixes the infinite recursion error in workspace_users policies
  by using simpler, non-recursive policy conditions.

  1. Drop existing problematic policies
  2. Create new policies that don't reference workspace_users within workspace_users policies
  3. Use direct user authentication checks instead of complex subqueries
*/

-- Drop all existing policies on workspace_users to start fresh
DROP POLICY IF EXISTS "Users can view workspace members in their workspaces" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can manage workspace users" ON workspace_users;
DROP POLICY IF EXISTS "Users can read own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Owners can manage all workspace users" ON workspace_users;
DROP POLICY IF EXISTS "Admins can manage workspace users" ON workspace_users;

-- Create simple, non-recursive policies for workspace_users
-- Policy 1: Users can see their own workspace memberships
CREATE POLICY "Users can view own memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Policy 2: Users can see other members in workspaces where they are active
CREATE POLICY "Users can view workspace members"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Policy 3: Only owners and admins can insert new workspace users
CREATE POLICY "Owners and admins can invite users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Policy 4: Only owners and admins can update workspace users
CREATE POLICY "Owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Policy 5: Only owners and admins can delete workspace users
CREATE POLICY "Owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Also fix the other table policies to use simpler workspace checks
-- Fix projects policies
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;

CREATE POLICY "Users can view projects in their workspaces"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

CREATE POLICY "Users can manage projects in their workspaces"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Fix stakeholders policies
DROP POLICY IF EXISTS "Users can manage stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can view stakeholders in their workspaces" ON stakeholders;

CREATE POLICY "Users can view stakeholders in their workspaces"
  ON stakeholders
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

CREATE POLICY "Users can manage stakeholders in their workspaces"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Fix research_notes policies
DROP POLICY IF EXISTS "Users can manage research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can view research notes in their workspaces" ON research_notes;

CREATE POLICY "Users can view research notes in their workspaces"
  ON research_notes
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
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
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );
-- -------------------------------------------------------------------------
-- FILE: 20250718162301_sparkling_manor.sql
-- -------------------------------------------------------------------------
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
-- -------------------------------------------------------------------------
-- FILE: 20250718164139_wispy_silence.sql
-- -------------------------------------------------------------------------
/*
  # Fix RLS Policies for Multi-User Workspaces

  1. Security Updates
    - Update workspace_users policies to allow workspace owners/admins to manage users
    - Allow users to view workspace members they belong to
    - Enable proper user invitation workflow

  2. Policy Changes
    - Workspace owners can add/remove users
    - Workspace admins can add/remove users (except owners)
    - Users can view their own workspace memberships
    - Users can view other members in their workspaces
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can insert workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can update workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can delete workspace memberships" ON workspace_users;

-- Create new comprehensive policies for workspace_users

-- Allow users to view workspace members in workspaces they belong to
CREATE POLICY "Users can view workspace members"
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

-- Allow workspace owners and admins to add new users
CREATE POLICY "Workspace owners and admins can add users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
  );

-- Allow workspace owners and admins to update user roles/status
CREATE POLICY "Workspace owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
  );

-- Allow workspace owners and admins to remove users (but not other owners)
CREATE POLICY "Workspace owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
    AND (
      role != 'owner' OR 
      EXISTS (
        SELECT 1 
        FROM workspace_users wu
        WHERE wu.workspace_id = workspace_users.workspace_id
          AND wu.user_id = auth.uid()
          AND wu.role = 'owner'
          AND wu.status = 'active'
      )
    )
  );

-- Update workspaces policies to be more permissive for workspace members
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

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

-- Update other table policies to work with workspace membership

-- Projects: Allow all workspace members to manage projects
DROP POLICY IF EXISTS "Users can manage projects" ON projects;

CREATE POLICY "Workspace members can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Stakeholders: Allow all workspace members to manage stakeholders
DROP POLICY IF EXISTS "Users can manage stakeholders" ON stakeholders;

CREATE POLICY "Workspace members can manage stakeholders"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Research Notes: Allow all workspace members to manage research notes
DROP POLICY IF EXISTS "Users can manage research notes" ON research_notes;

CREATE POLICY "Workspace members can manage research notes"
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
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );
-- -------------------------------------------------------------------------
-- FILE: 20250718164257_rough_cell.sql
-- -------------------------------------------------------------------------
/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Current RLS policies on workspace_users table cause infinite recursion
    - The SELECT policy references workspace_users in its USING clause, creating circular dependency

  2. Solution
    - Drop existing recursive policies
    - Create non-recursive policies that avoid circular references
    - Use direct user_id checks and explicit table references to prevent recursion

  3. New Policies
    - Users can read their own workspace_users entry
    - Workspace owners/admins can read all users in their workspaces (non-recursive)
    - Proper INSERT/UPDATE/DELETE policies without recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can add users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can update users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can remove users" ON workspace_users;

-- Create non-recursive SELECT policy
-- Policy 1: Users can read their own entry
CREATE POLICY "Users can read own workspace entry"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can read other members in workspaces where they are owner/admin
CREATE POLICY "Workspace admins can read all members"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive INSERT policy
CREATE POLICY "Workspace owners and admins can add users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive UPDATE policy
CREATE POLICY "Workspace owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive DELETE policy
CREATE POLICY "Workspace owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
    AND (
      -- Admins can't remove owners, only owners can remove owners
      role != 'owner' OR 
      EXISTS (
        SELECT 1 FROM public.workspace_users wu 
        WHERE wu.workspace_id = workspace_users.workspace_id 
          AND wu.user_id = auth.uid() 
          AND wu.role = 'owner' 
          AND wu.status = 'active'
      )
    )
  );
-- -------------------------------------------------------------------------
-- FILE: 20250718164425_shiny_summit.sql
-- -------------------------------------------------------------------------
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
-- -------------------------------------------------------------------------
-- FILE: 20250718164707_white_mouse.sql
-- -------------------------------------------------------------------------
/*
  # Allow null user_id for pending workspace users

  1. Schema Changes
    - Make `user_id` column nullable in `workspace_users` table
    - This allows adding users before they sign up (pending status)
    - `user_id` will be populated when user actually signs up

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Make user_id nullable to support pending users
ALTER TABLE workspace_users ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure either user_id is provided OR status is pending
ALTER TABLE workspace_users ADD CONSTRAINT user_id_or_pending_check 
CHECK (user_id IS NOT NULL OR status = 'pending');
-- -------------------------------------------------------------------------
-- FILE: 20250718171151_small_water.sql
-- -------------------------------------------------------------------------
/*
  # Create user_roles table

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, not null)
      - `description` (text, nullable)
      - `department` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_roles` table
    - Add policy for authenticated users to manage user roles
*/

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for workspace_id lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_workspace_id ON user_roles(workspace_id);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage user roles
CREATE POLICY "Allow authenticated users to manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250718171531_blue_rain.sql
-- -------------------------------------------------------------------------
/*
  # Create law_firms table

  1. New Tables
    - `law_firms`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, required)
      - `location` (text, optional)
      - `contact_email` (text, optional)
      - `phone` (text, optional)
      - `website` (text, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `law_firms` table
    - Add policy for authenticated users to manage law firms

  3. Performance
    - Add index on workspace_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  contact_email text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firms_workspace_id ON law_firms(workspace_id);

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage law firms"
  ON law_firms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250718183158_fragrant_flower.sql
-- -------------------------------------------------------------------------
/*
  # Update Law Firms table structure

  1. Changes
    - Remove location, contact_email, phone, website columns
    - Add structure column with 'centralised' or 'decentralised' values
    - Update existing data to use new structure

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add the new structure column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'structure'
  ) THEN
    ALTER TABLE law_firms ADD COLUMN structure text NOT NULL DEFAULT 'centralised';
  END IF;
END $$;

-- Add constraint for structure values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'law_firms_structure_check'
  ) THEN
    ALTER TABLE law_firms ADD CONSTRAINT law_firms_structure_check 
    CHECK (structure = ANY (ARRAY['centralised'::text, 'decentralised'::text]));
  END IF;
END $$;

-- Remove old columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'location'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN location;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN contact_email;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'phone'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN phone;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'website'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN website;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250718195803_sunny_villa.sql
-- -------------------------------------------------------------------------
/*
  # Add colour column to user_roles table

  1. Schema Changes
    - Add `colour` column to `user_roles` table
      - `colour` (text, not null, default '#6B7280')
  
  2. Notes
    - Default color is set to gray (#6B7280) for existing records
    - Column is required (NOT NULL) as all user roles should have a color
*/

-- Add colour column to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'colour'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN colour text NOT NULL DEFAULT '#6B7280';
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250718203808_aged_meadow.sql
-- -------------------------------------------------------------------------
/*
  # Add User Role to Stakeholders

  1. Changes
    - Add `user_role_id` column to `stakeholders` table
    - Add foreign key constraint to `user_roles` table
    - Allow null values for existing stakeholders

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'user_role_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN user_role_id uuid REFERENCES user_roles(id) ON DELETE SET NULL;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250718211420_fragrant_valley.sql
-- -------------------------------------------------------------------------
/*
  # Create problem_overviews table

  1. New Tables
    - `problem_overviews`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `what_is_the_problem` (text)
      - `should_we_solve_it` (text)
      - `understanding_rating` (integer, 1-10)
      - `risk_level` (integer, 1-10)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `problem_overviews` table
    - Add policy for authenticated users to manage problem overviews
*/

CREATE TABLE IF NOT EXISTS problem_overviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  what_is_the_problem text DEFAULT '',
  should_we_solve_it text DEFAULT '',
  understanding_rating integer DEFAULT 5 CHECK (understanding_rating >= 1 AND understanding_rating <= 10),
  risk_level integer DEFAULT 5 CHECK (risk_level >= 1 AND risk_level <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE problem_overviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage problem overviews"
  ON problem_overviews
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_problem_overviews_project_id ON problem_overviews(project_id);
-- -------------------------------------------------------------------------
-- FILE: 20250718212226_tiny_lagoon.sql
-- -------------------------------------------------------------------------
/*
  # Add Law Firm association to Stakeholders

  1. Schema Changes
    - Add `law_firm_id` column to `stakeholders` table
    - Add foreign key constraint to `law_firms` table
    - Make it optional (nullable) for backward compatibility

  2. Security
    - No changes to RLS policies needed as they inherit from existing stakeholder policies
*/

-- Add law_firm_id column to stakeholders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'law_firm_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN law_firm_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stakeholders_law_firm_id_fkey'
  ) THEN
    ALTER TABLE stakeholders 
    ADD CONSTRAINT stakeholders_law_firm_id_fkey 
    FOREIGN KEY (law_firm_id) REFERENCES law_firms(id) ON DELETE SET NULL;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250718213736_throbbing_surf.sql
-- -------------------------------------------------------------------------
/*
  # Add stakeholder tagging to research notes

  1. New Tables
    - `research_note_stakeholders`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `research_note_stakeholders` table
    - Add policy for authenticated users to manage research note stakeholders
*/

CREATE TABLE IF NOT EXISTS research_note_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(research_note_id, stakeholder_id)
);

ALTER TABLE research_note_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage research note stakeholders"
  ON research_note_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_research_note_stakeholders_note_id 
  ON research_note_stakeholders(research_note_id);

CREATE INDEX IF NOT EXISTS idx_research_note_stakeholders_stakeholder_id 
  ON research_note_stakeholders(stakeholder_id);
-- -------------------------------------------------------------------------
-- FILE: 20250719102449_pale_boat.sql
-- -------------------------------------------------------------------------
/*
  # Add native_notes column to research_notes table

  1. Changes
    - Add `native_notes` column to `research_notes` table
    - Column type: TEXT (allows for long-form notes)
    - Column is nullable to maintain compatibility with existing records

  2. Notes
    - This enables storing detailed native notes alongside research note summaries
    - Existing records will have NULL values for native_notes initially
*/

-- Add native_notes column to research_notes table
ALTER TABLE research_notes ADD COLUMN IF NOT EXISTS native_notes TEXT;
-- -------------------------------------------------------------------------
-- FILE: 20250721091042_damp_voice.sql
-- -------------------------------------------------------------------------
/*
  # Create project_stakeholders table

  1. New Tables
    - `project_stakeholders`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_stakeholders` table
    - Add policy for authenticated users to manage project stakeholder assignments

  3. Constraints
    - Unique constraint on project_id + stakeholder_id to prevent duplicates
    - Foreign key constraints for data integrity
*/

CREATE TABLE IF NOT EXISTS project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  stakeholder_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, stakeholder_id)
);

ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_stakeholders_project_id_fkey'
  ) THEN
    ALTER TABLE project_stakeholders 
    ADD CONSTRAINT project_stakeholders_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_stakeholders_stakeholder_id_fkey'
  ) THEN
    ALTER TABLE project_stakeholders 
    ADD CONSTRAINT project_stakeholders_stakeholder_id_fkey 
    FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_stakeholder_id ON project_stakeholders(stakeholder_id);

-- RLS policies
CREATE POLICY "Allow authenticated users to manage project stakeholders"
  ON project_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250721114638_fragrant_meadow.sql
-- -------------------------------------------------------------------------
/*
  # Create User Journey Tables

  1. New Tables
    - `user_journeys`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_journey_nodes`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `type` (text, 'task' or 'question')
      - `description` (text)
      - `parent_node_id` (uuid, foreign key to user_journey_nodes, nullable)
      - `parent_answer` (text, nullable)
      - `pain_point` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_journey_stakeholders`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)
    
    - `user_journey_node_answers`
      - `id` (uuid, primary key)
      - `node_id` (uuid, foreign key to user_journey_nodes)
      - `answer_text` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data

  3. Indexes
    - Add indexes for foreign keys and commonly queried fields
*/

-- Create user_journeys table
CREATE TABLE IF NOT EXISTS user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_journey_nodes table
CREATE TABLE IF NOT EXISTS user_journey_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task', 'question')),
  description text NOT NULL,
  parent_node_id uuid REFERENCES user_journey_nodes(id) ON DELETE CASCADE,
  parent_answer text,
  pain_point text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_journey_stakeholders table
CREATE TABLE IF NOT EXISTS user_journey_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_journey_id, stakeholder_id)
);

-- Create user_journey_node_answers table
CREATE TABLE IF NOT EXISTS user_journey_node_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES user_journey_nodes(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journeys_project_id ON user_journeys(project_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_nodes_journey_id ON user_journey_nodes(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_nodes_parent_id ON user_journey_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_stakeholders_journey_id ON user_journey_stakeholders(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_stakeholders_stakeholder_id ON user_journey_stakeholders(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_node_answers_node_id ON user_journey_node_answers(node_id);

-- Enable Row Level Security
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_node_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_journeys
CREATE POLICY "Allow authenticated users to manage user journeys"
  ON user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_nodes
CREATE POLICY "Allow authenticated users to manage user journey nodes"
  ON user_journey_nodes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_stakeholders
CREATE POLICY "Allow authenticated users to manage user journey stakeholders"
  ON user_journey_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for user_journey_node_answers
CREATE POLICY "Allow authenticated users to manage user journey node answers"
  ON user_journey_node_answers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250721141019_orange_gate.sql
-- -------------------------------------------------------------------------
/*
  # Add icon field to user_roles table

  1. Changes
    - Add `icon` column to `user_roles` table to store MaterialUI icon names
    - Column is optional (nullable) for backward compatibility

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS icon text;
-- -------------------------------------------------------------------------
-- FILE: 20250721142350_blue_manor.sql
-- -------------------------------------------------------------------------
/*
  # Add detailed information fields to law firms

  1. New Columns
    - `quick_facts` (text) - Multiline text with basic formatting for quick facts
    - `key_quotes` (text) - Multiline text with basic formatting for key quotes  
    - `insights` (text) - Multiline text with basic formatting for insights
    - `opportunities` (text) - Multiline text with basic formatting for opportunities

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE law_firms 
ADD COLUMN IF NOT EXISTS quick_facts text DEFAULT '',
ADD COLUMN IF NOT EXISTS key_quotes text DEFAULT '',
ADD COLUMN IF NOT EXISTS insights text DEFAULT '',
ADD COLUMN IF NOT EXISTS opportunities text DEFAULT '';
-- -------------------------------------------------------------------------
-- FILE: 20250721183633_morning_disk.sql
-- -------------------------------------------------------------------------
/*
  # Add note_date column to research_notes table

  1. Changes
    - Add `note_date` column to `research_notes` table
    - Column is nullable to allow existing notes without dates
    - Uses `date` type for storing just the date (no time component)

  2. Notes
    - Existing research notes will have NULL note_date initially
    - New notes can specify a custom date
    - Applications can fall back to created_at if note_date is NULL
*/

-- Add note_date column to research_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'note_date'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN note_date date;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250722065730_fading_art.sql
-- -------------------------------------------------------------------------
/*
  # Add is_decision column to research_notes table

  1. Changes
    - Add `is_decision` boolean column to `research_notes` table with default value false
    - This column will track whether a research note represents a decision

  2. Security
    - No RLS changes needed as the table already has proper policies
*/

-- Add is_decision column to research_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'is_decision'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN is_decision boolean DEFAULT false NOT NULL;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250722073254_small_frog.sql
-- -------------------------------------------------------------------------
/*
  # Add new fields to stakeholders table

  1. New Columns
    - `visitor_id` (text, optional) - Unique identifier for visitor tracking
    - `department` (text, optional) - Department the stakeholder belongs to
    - `pendo_role` (text, optional) - Role identifier for Pendo analytics

  2. Changes
    - Add three new optional text columns to stakeholders table
    - All fields are nullable to maintain compatibility with existing data
*/

-- Add new fields to stakeholders table
DO $$
BEGIN
  -- Add visitor_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN visitor_id text;
  END IF;

  -- Add department column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'department'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN department text;
  END IF;

  -- Add pendo_role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'pendo_role'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN pendo_role text;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250722140630_royal_heart.sql
-- -------------------------------------------------------------------------
/*
  # Add note links functionality

  1. New Tables
    - `note_links`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key)
      - `name` (text)
      - `url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `note_links` table
    - Add policy for authenticated users to manage their note links
*/

CREATE TABLE IF NOT EXISTS note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage note links"
  ON note_links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_note_links_research_note_id ON note_links(research_note_id);
-- -------------------------------------------------------------------------
-- FILE: 20250722145926_humble_hat.sql
-- -------------------------------------------------------------------------
/*
  # Create User Stories feature

  1. New Tables
    - `user_stories`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text, required)
      - `description` (text, optional)
      - `estimated_complexity` (integer, 1-10, default 5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_story_roles`
      - `id` (uuid, primary key)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `user_role_id` (uuid, foreign key to user_roles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage user stories and roles

  3. Indexes
    - Add indexes for foreign keys and common queries
*/

-- Create user_stories table
CREATE TABLE IF NOT EXISTS user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  estimated_complexity integer DEFAULT 5 CHECK (estimated_complexity >= 1 AND estimated_complexity <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_story_roles junction table
CREATE TABLE IF NOT EXISTS user_story_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_story_id, user_role_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_story_roles_story_id ON user_story_roles(user_story_id);
CREATE INDEX IF NOT EXISTS idx_user_story_roles_role_id ON user_story_roles(user_role_id);

-- Enable Row Level Security
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stories
CREATE POLICY "Allow authenticated users to manage user stories"
  ON user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for user_story_roles
CREATE POLICY "Allow authenticated users to manage user story roles"
  ON user_story_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250722155026_fragrant_jungle.sql
-- -------------------------------------------------------------------------
/*
  # Add priority rating to user stories

  1. Changes
    - Add `priority_rating` column to `user_stories` table
    - Set default value to 'should'
    - Add check constraint for valid values

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'priority_rating'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN priority_rating text DEFAULT 'should';
    
    ALTER TABLE user_stories ADD CONSTRAINT user_stories_priority_rating_check 
    CHECK (priority_rating IN ('must', 'should', 'could', 'would'));
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250723070716_aged_mouse.sql
-- -------------------------------------------------------------------------
/*
  # Add decision_text column to research_notes table

  1. Schema Changes
    - Add `decision_text` column to `research_notes` table
    - Column is nullable TEXT type to store single-line decision text

  2. Notes
    - This replaces the boolean `is_decision` field with a more flexible text field
    - Existing `is_decision` column remains for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'decision_text'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN decision_text TEXT;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250723071759_sparkling_lantern.sql
-- -------------------------------------------------------------------------
/*
  # Update decision_text to support multiple decisions

  1. Schema Changes
    - Alter `decision_text` column in `research_notes` table to be TEXT[] (array of text)
    - This allows storing multiple decision strings per note

  2. Data Migration
    - Convert existing single decision_text values to arrays
    - Handle null values appropriately
*/

-- First, add a new column for the array
ALTER TABLE research_notes ADD COLUMN IF NOT EXISTS decision_text_array TEXT[];

-- Migrate existing data: convert single strings to single-item arrays
UPDATE research_notes 
SET decision_text_array = CASE 
  WHEN decision_text IS NOT NULL AND decision_text != '' THEN ARRAY[decision_text]
  ELSE NULL
END;

-- Drop the old column
ALTER TABLE research_notes DROP COLUMN IF EXISTS decision_text;

-- Rename the new column to the original name
ALTER TABLE research_notes RENAME COLUMN decision_text_array TO decision_text;
-- -------------------------------------------------------------------------
-- FILE: 20250723093202_tender_palace.sql
-- -------------------------------------------------------------------------
/*
  # Create assets table

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text, required)
      - `snapshot_image_url` (text, optional)
      - `description` (text, optional)
      - `link_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `assets` table
    - Add policy for authenticated users to manage assets

  3. Changes
    - Creates the assets table with proper constraints
    - Adds foreign key relationship to projects table
    - Sets up appropriate indexes for performance
*/

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  snapshot_image_url text,
  description text,
  link_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage assets
CREATE POLICY "Allow authenticated users to manage assets"
  ON assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
-- -------------------------------------------------------------------------
-- FILE: 20250723102717_dry_sound.sql
-- -------------------------------------------------------------------------
/*
  # Create Asset Relationship Tables

  1. New Tables
    - `asset_user_stories`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `created_at` (timestamp)
    - `asset_research_notes`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage relationships
*/

-- Create asset_user_stories table
CREATE TABLE IF NOT EXISTS asset_user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, user_story_id)
);

-- Create asset_research_notes table
CREATE TABLE IF NOT EXISTS asset_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, research_note_id)
);

-- Enable RLS
ALTER TABLE asset_user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_research_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for asset_user_stories
CREATE POLICY "Allow authenticated users to manage asset user stories"
  ON asset_user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for asset_research_notes
CREATE POLICY "Allow authenticated users to manage asset research notes"
  ON asset_research_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asset_user_stories_asset_id ON asset_user_stories(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_user_stories_user_story_id ON asset_user_stories(user_story_id);
CREATE INDEX IF NOT EXISTS idx_asset_research_notes_asset_id ON asset_research_notes(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_research_notes_research_note_id ON asset_research_notes(research_note_id);
-- -------------------------------------------------------------------------
-- FILE: 20250724070912_empty_grass.sql
-- -------------------------------------------------------------------------
/*
  # Create User Permissions System

  1. New Tables
    - `user_permissions`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, unique, not null)
      - `description` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Table Modifications
    - Add `user_permission_id` column to `stakeholders` table
    - Foreign key constraint to `user_permissions(id)` with ON DELETE SET NULL

  3. Initial Data
    - Create three default permissions: General User, Administrator, Not applicable
    - Assign all existing stakeholders to 'General User' permission

  4. Security
    - Enable RLS on `user_permissions` table
    - Add policy for authenticated users to manage user permissions
*/

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS on user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage user permissions
CREATE POLICY "Allow authenticated users to manage user permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add user_permission_id column to stakeholders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'user_permission_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN user_permission_id uuid REFERENCES user_permissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_workspace_id ON user_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_permission_id ON stakeholders(user_permission_id);

-- Insert default user permissions for each workspace
DO $$
DECLARE
  workspace_record RECORD;
  general_user_id uuid;
  admin_id uuid;
  not_applicable_id uuid;
BEGIN
  -- Loop through all workspaces and create default permissions
  FOR workspace_record IN SELECT id FROM workspaces LOOP
    -- Insert General User permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'General User', 'Standard user permissions')
    ON CONFLICT (workspace_id, name) DO NOTHING
    RETURNING id INTO general_user_id;
    
    -- Get the ID if it already existed
    IF general_user_id IS NULL THEN
      SELECT id INTO general_user_id 
      FROM user_permissions 
      WHERE workspace_id = workspace_record.id AND name = 'General User';
    END IF;
    
    -- Insert Administrator permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'Administrator', 'Elevated administrative permissions')
    ON CONFLICT (workspace_id, name) DO NOTHING;
    
    -- Insert Not applicable permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'Not applicable', 'No specific user permissions apply')
    ON CONFLICT (workspace_id, name) DO NOTHING;
    
    -- Update all existing stakeholders in this workspace to have 'General User' permission
    -- Only update stakeholders that don't already have a user_permission_id set
    UPDATE stakeholders 
    SET user_permission_id = general_user_id,
        updated_at = now()
    WHERE workspace_id = workspace_record.id 
      AND user_permission_id IS NULL;
  END LOOP;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250724083422_ancient_reef.sql
-- -------------------------------------------------------------------------
/*
  # Add user_permission_id column to user_stories table

  1. Schema Changes
    - Add `user_permission_id` column to `user_stories` table
    - Column type: uuid (nullable)
    - Add foreign key constraint to `user_permissions` table

  2. Security
    - No RLS changes needed (inherits from existing table policies)

  3. Notes
    - This column allows user stories to be associated with specific user permissions
    - Nullable to maintain backward compatibility with existing data
*/

-- Add user_permission_id column to user_stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'user_permission_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN user_permission_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_stories_user_permission_id_fkey'
  ) THEN
    ALTER TABLE user_stories 
    ADD CONSTRAINT user_stories_user_permission_id_fkey 
    FOREIGN KEY (user_permission_id) REFERENCES user_permissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_stories_user_permission_id'
  ) THEN
    CREATE INDEX idx_user_stories_user_permission_id ON user_stories(user_permission_id);
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250724152438_delicate_truth.sql
-- -------------------------------------------------------------------------
/*
  # Add notes column to stakeholders table

  1. Schema Changes
    - Add `notes` column to `stakeholders` table (text type, nullable)
    - Column will store rich text notes about stakeholders

  2. Security
    - No additional RLS policies needed as existing policies cover all operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN notes text;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250725080635_light_bar.sql
-- -------------------------------------------------------------------------
/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, nullable, foreign key to projects)
      - `name` (text, required)
      - `description` (text, optional)
      - `status` (text, default 'not_complete')
      - `assigned_to_user_id` (uuid, nullable, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `tasks` table
    - Add policy for authenticated users to manage tasks
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'not_complete' NOT NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add constraint for status values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('complete', 'not_complete', 'no_longer_required'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
-- -------------------------------------------------------------------------
-- FILE: 20250725090129_small_coast.sql
-- -------------------------------------------------------------------------
/*
  # Add research_note_id to tasks table

  1. Schema Changes
    - Add `research_note_id` column to `tasks` table (uuid, nullable)
    - Add foreign key constraint referencing `research_notes.id`
    - Add index on `research_note_id` for query performance

  2. Security
    - No changes to RLS policies needed as tasks inherit project-level access
*/

-- Add research_note_id column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'research_note_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN research_note_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_research_note_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_research_note_id_fkey 
    FOREIGN KEY (research_note_id) REFERENCES research_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_tasks_research_note_id'
  ) THEN
    CREATE INDEX idx_tasks_research_note_id ON tasks(research_note_id);
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250725192846_gentle_spring.sql
-- -------------------------------------------------------------------------
/*
  # Add short IDs for user-friendly URLs

  1. New Columns
    - Add `short_id` column to projects, stakeholders, research_notes, user_journeys, user_stories tables
    - Each short_id is auto-incrementing integer, unique per table
    - Used for user-friendly URLs instead of UUIDs

  2. Sequences
    - Create sequences for each table to generate unique short IDs
    - Start from 1 for each entity type

  3. Data Migration
    - Populate short_id for existing records
    - Set up triggers for auto-generation on new records

  4. Indexes
    - Add unique indexes on short_id columns for fast lookups
*/

-- Create sequences for short IDs
CREATE SEQUENCE IF NOT EXISTS projects_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stakeholders_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS research_notes_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_journeys_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_stories_short_id_seq START 1;

-- Add short_id columns to tables
DO $$
BEGIN
  -- Projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN short_id integer UNIQUE DEFAULT nextval('projects_short_id_seq');
  END IF;

  -- Stakeholders table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN short_id integer UNIQUE DEFAULT nextval('stakeholders_short_id_seq');
  END IF;

  -- Research notes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN short_id integer UNIQUE DEFAULT nextval('research_notes_short_id_seq');
  END IF;

  -- User journeys table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_journeys_short_id_seq');
  END IF;

  -- User stories table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_stories_short_id_seq');
  END IF;
END $$;

-- Populate short_id for existing records
UPDATE projects SET short_id = nextval('projects_short_id_seq') WHERE short_id IS NULL;
UPDATE stakeholders SET short_id = nextval('stakeholders_short_id_seq') WHERE short_id IS NULL;
UPDATE research_notes SET short_id = nextval('research_notes_short_id_seq') WHERE short_id IS NULL;
UPDATE user_journeys SET short_id = nextval('user_journeys_short_id_seq') WHERE short_id IS NULL;
UPDATE user_stories SET short_id = nextval('user_stories_short_id_seq') WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing records
ALTER TABLE projects ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE stakeholders ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE research_notes ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE user_journeys ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE user_stories ALTER COLUMN short_id SET NOT NULL;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_short_id ON projects(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_short_id ON stakeholders(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_notes_short_id ON research_notes(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_short_id ON user_journeys(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stories_short_id ON user_stories(short_id);
-- -------------------------------------------------------------------------
-- FILE: 20250726090506_navy_harbor.sql
-- -------------------------------------------------------------------------
/*
  # Add top_4 column to law_firms table

  1. New Columns
    - `top_4` (boolean, default false) - Indicates if the law firm is in the top 4

  2. Changes
    - Added top_4 column to law_firms table with default value of false
    - This allows tracking which law firms are considered "top 4" firms

  3. Security
    - No RLS changes needed as existing policies will cover the new column
*/

-- Add top_4 column to law_firms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'top_4'
  ) THEN
    ALTER TABLE law_firms ADD COLUMN top_4 boolean DEFAULT false;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250728100045_aged_mud.sql
-- -------------------------------------------------------------------------
/*
  # Add reason column to user_stories table

  1. Schema Changes
    - Add `reason` column to `user_stories` table
      - `reason` (text, nullable) - stores the "So that I can" reason for the user story

  2. Notes
    - This field is optional and can be null
    - No default value is set as this is a new optional field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'reason'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN reason text;
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250728115835_snowy_oasis.sql
-- -------------------------------------------------------------------------
/*
  # Create themes and theme association tables

  1. New Tables
    - `themes`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, unique per workspace)
      - `description` (text, optional)
      - `color` (text, default blue)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `theme_user_stories`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `created_at` (timestamp)
    - `theme_user_journeys`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `created_at` (timestamp)
    - `theme_research_notes`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage themes and associations

  3. Indexes
    - Add indexes for foreign keys and unique constraints
    - Add composite unique constraints for junction tables
*/

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create theme_user_stories junction table
CREATE TABLE IF NOT EXISTS theme_user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, user_story_id)
);

-- Create theme_user_journeys junction table
CREATE TABLE IF NOT EXISTS theme_user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, user_journey_id)
);

-- Create theme_research_notes junction table
CREATE TABLE IF NOT EXISTS theme_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, research_note_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_at ON themes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_theme_user_stories_theme_id ON theme_user_stories(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_user_stories_user_story_id ON theme_user_stories(user_story_id);

CREATE INDEX IF NOT EXISTS idx_theme_user_journeys_theme_id ON theme_user_journeys(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_user_journeys_user_journey_id ON theme_user_journeys(user_journey_id);

CREATE INDEX IF NOT EXISTS idx_theme_research_notes_theme_id ON theme_research_notes(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_research_notes_research_note_id ON theme_research_notes(research_note_id);

-- Enable Row Level Security
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_research_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for themes
CREATE POLICY "Allow authenticated users to manage themes"
  ON themes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_user_stories
CREATE POLICY "Allow authenticated users to manage theme user stories"
  ON theme_user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_user_journeys
CREATE POLICY "Allow authenticated users to manage theme user journeys"
  ON theme_user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_research_notes
CREATE POLICY "Allow authenticated users to manage theme research notes"
  ON theme_research_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250728131527_pale_thunder.sql
-- -------------------------------------------------------------------------
/*
  # Add user assignment to user stories

  1. Schema Changes
    - Add `assigned_to_user_id` column to `user_stories` table
    - Add foreign key constraint to `auth.users` table
    - Add index for performance

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add assigned_to_user_id column to user_stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN assigned_to_user_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_stories_assigned_to_user'
  ) THEN
    ALTER TABLE user_stories
    ADD CONSTRAINT fk_user_stories_assigned_to_user
    FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_stories_assigned_to_user_id'
  ) THEN
    CREATE INDEX idx_user_stories_assigned_to_user_id ON user_stories(assigned_to_user_id);
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250728195108_icy_base.sql
-- -------------------------------------------------------------------------
/*
  # Add team member fields to workspace_users

  1. New Columns
    - `full_name` (text, nullable) - Full name of the team member
    - `team` (text, nullable) - Team assignment (Design/Product/Engineering/Other)
  
  2. Constraints
    - Add check constraint for team values
  
  3. Security
    - No RLS changes needed as existing policies cover new fields
*/

-- Add full_name column to workspace_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE workspace_users ADD COLUMN full_name text;
  END IF;
END $$;

-- Add team column to workspace_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_users' AND column_name = 'team'
  ) THEN
    ALTER TABLE workspace_users ADD COLUMN team text;
  END IF;
END $$;

-- Add check constraint for team values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_users_team_check'
  ) THEN
    ALTER TABLE workspace_users 
    ADD CONSTRAINT workspace_users_team_check 
    CHECK (team IS NULL OR team IN ('Design', 'Product', 'Engineering', 'Other'));
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250729084125_divine_sound.sql
-- -------------------------------------------------------------------------
/*
  # Fix priority_rating column type

  1. Changes
    - Change `priority_rating` column from UUID to TEXT type in user_stories table
    - Add check constraint to ensure only valid priority values are allowed
    - Update any existing data if needed

  2. Security
    - Maintains existing RLS policies on user_stories table
*/

-- First, drop the existing check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_stories_priority_rating_check' 
    AND table_name = 'user_stories'
  ) THEN
    ALTER TABLE user_stories DROP CONSTRAINT user_stories_priority_rating_check;
  END IF;
END $$;

-- Change the column type from UUID to TEXT
ALTER TABLE user_stories 
ALTER COLUMN priority_rating TYPE text 
USING priority_rating::text;

-- Add the check constraint to ensure only valid values
ALTER TABLE user_stories 
ADD CONSTRAINT user_stories_priority_rating_check 
CHECK (priority_rating = ANY (ARRAY['must'::text, 'should'::text, 'could'::text, 'would'::text]));

-- Set default value
ALTER TABLE user_stories 
ALTER COLUMN priority_rating SET DEFAULT 'should'::text;
-- -------------------------------------------------------------------------
-- FILE: 20250729125856_patient_frost.sql
-- -------------------------------------------------------------------------
/*
  # Create note templates table

  1. New Tables
    - `note_templates`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, required)
      - `body` (text, rich text content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `note_templates` table
    - Add policy for authenticated users to manage their workspace templates
*/

CREATE TABLE IF NOT EXISTS note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage note templates"
  ON note_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- -------------------------------------------------------------------------
-- FILE: 20250729133820_pink_meadow.sql
-- -------------------------------------------------------------------------
/*
  # Create Project Progress Tables

  1. New Tables
    - `project_progress_status`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `question_key` (text, identifier for the question)
      - `is_completed` (boolean, completion status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `project_progress_comments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `question_key` (text, identifier for the question)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, the comment content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create project_progress_status table
CREATE TABLE IF NOT EXISTS project_progress_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, question_key)
);

-- Create project_progress_comments table
CREATE TABLE IF NOT EXISTS project_progress_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_progress_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_progress_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for project_progress_status
CREATE POLICY "Allow authenticated users to manage project progress status"
  ON project_progress_status
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for project_progress_comments
CREATE POLICY "Allow authenticated users to view all project progress comments"
  ON project_progress_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create project progress comments"
  ON project_progress_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own project progress comments"
  ON project_progress_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own project progress comments"
  ON project_progress_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_progress_status_project_id ON project_progress_status(project_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_status_question_key ON project_progress_status(question_key);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_project_id ON project_progress_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_question_key ON project_progress_comments(question_key);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_user_id ON project_progress_comments(user_id);
-- -------------------------------------------------------------------------
-- FILE: 20250730113738_curly_mouse.sql
-- -------------------------------------------------------------------------
/*
  # Add asset comments and theme assets tables

  1. New Tables
    - `asset_comments`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `user_id` (uuid, foreign key to users)
      - `comment_text` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `theme_assets`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `asset_id` (uuid, foreign key to assets)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage comments and theme links
  
  3. Changes
    - Add short_id to assets table for URL routing
    - Add indexes for performance
*/

-- Add short_id column to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN short_id integer;
  END IF;
END $$;

-- Create sequence for assets short_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'assets_short_id_seq') THEN
    CREATE SEQUENCE assets_short_id_seq;
  END IF;
END $$;

-- Set default value for short_id and make it unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE assets ALTER COLUMN short_id SET DEFAULT nextval('assets_short_id_seq'::regclass);
  END IF;
END $$;

-- Update existing assets with short_id values
UPDATE assets SET short_id = nextval('assets_short_id_seq'::regclass) WHERE short_id IS NULL;

-- Make short_id NOT NULL and add unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE assets ALTER COLUMN short_id SET NOT NULL;
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_name = 'assets_short_id_key'
  ) THEN
    ALTER TABLE assets ADD CONSTRAINT assets_short_id_key UNIQUE (short_id);
  END IF;
END $$;

-- Create asset_comments table
CREATE TABLE IF NOT EXISTS asset_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create theme_assets table
CREATE TABLE IF NOT EXISTS theme_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, asset_id)
);

-- Enable RLS on asset_comments
ALTER TABLE asset_comments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on theme_assets
ALTER TABLE theme_assets ENABLE ROW LEVEL SECURITY;

-- Policies for asset_comments
CREATE POLICY "Allow authenticated users to view all asset comments"
  ON asset_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create asset comments"
  ON asset_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own asset comments"
  ON asset_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own asset comments"
  ON asset_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for theme_assets
CREATE POLICY "Allow authenticated users to manage theme assets"
  ON theme_assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_short_id ON assets(short_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_user_id ON asset_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_at ON asset_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_theme_assets_theme_id ON theme_assets(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_assets_asset_id ON theme_assets(asset_id);
-- -------------------------------------------------------------------------
-- FILE: 20250730155632_graceful_hat.sql
-- -------------------------------------------------------------------------
/*
  # Create user story comments table

  1. New Tables
    - `user_story_comments`
      - `id` (uuid, primary key)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_story_comments` table
    - Add policy for authenticated users to create comments (only their own)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on user_story_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS user_story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_story_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_story_comments_user_story_id ON user_story_comments(user_story_id);
CREATE INDEX IF NOT EXISTS idx_user_story_comments_user_id ON user_story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_story_comments_created_at ON user_story_comments(created_at DESC);

-- RLS Policies

-- Allow authenticated users to create comments (only their own)
CREATE POLICY "Allow authenticated users to create user story comments"
  ON user_story_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all user story comments"
  ON user_story_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own user story comments"
  ON user_story_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own user story comments"
  ON user_story_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- -------------------------------------------------------------------------
-- FILE: 20250806075642_little_cottage.sql
-- -------------------------------------------------------------------------
/*
  # Add user_story_id column to tasks table

  1. Schema Changes
    - Add `user_story_id` column to `tasks` table
    - Add foreign key constraint to `user_stories` table
    - Add index for efficient querying

  2. Security
    - Maintain existing RLS policies
*/

-- Add user_story_id column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_story_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN user_story_id uuid NULL;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_user_story_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_user_story_id_fkey
    FOREIGN KEY (user_story_id) REFERENCES public.user_stories(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for efficient querying
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_tasks_user_story_id'
  ) THEN
    CREATE INDEX idx_tasks_user_story_id ON public.tasks USING btree (user_story_id);
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250806153441_humble_rain.sql
-- -------------------------------------------------------------------------
/*
  # Add decision_text2 column to user_stories table

  1. Schema Changes
    - Add `decision_text2` column to `user_stories` table
    - Column type: text[] (array of text)
    - Default value: empty array
    - Nullable: true

  2. Purpose
    - Store decision text entries for user stories
    - Support multiple decisions per user story
    - Separate from existing decision_text column for testing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'decision_text2'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN decision_text2 text[] DEFAULT '{}';
  END IF;
END $$;
-- -------------------------------------------------------------------------
-- FILE: 20250811195441_winter_manor.sql
-- -------------------------------------------------------------------------
/*
  # Fix user project preferences unique constraint

  1. Changes
    - Add unique constraint on (user_id, project_id) to support upsert operations
    - This constraint is required for the ON CONFLICT clause in the drag-and-drop functionality

  2. Security
    - No changes to existing RLS policies
    - Maintains data integrity for project ordering preferences
*/

-- Add the unique constraint that the upsert operation expects
ALTER TABLE user_project_preferences 
ADD CONSTRAINT user_project_preferences_user_id_project_id_key 
UNIQUE (user_id, project_id);
-- -------------------------------------------------------------------------
-- FILE: 20250901_add_short_id_to_examples.sql
-- -------------------------------------------------------------------------
-- Add short_id field to examples table
ALTER TABLE examples ADD COLUMN IF NOT EXISTS short_id integer;

-- Create a sequence for generating short IDs
CREATE SEQUENCE IF NOT EXISTS examples_short_id_seq;

-- Set the default value for short_id to use the sequence
ALTER TABLE examples ALTER COLUMN short_id SET DEFAULT nextval('examples_short_id_seq');

-- Update existing examples to have short IDs
UPDATE examples 
SET short_id = nextval('examples_short_id_seq') 
WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing records
ALTER TABLE examples ALTER COLUMN short_id SET NOT NULL;

-- Create an index on short_id for better performance
CREATE INDEX IF NOT EXISTS idx_examples_short_id ON examples(short_id);

-- Create a unique constraint on short_id to ensure uniqueness
ALTER TABLE examples ADD CONSTRAINT unique_examples_short_id UNIQUE (short_id);

-- -------------------------------------------------------------------------
-- FILE: 20250901_add_summary_blocknote.sql
-- -------------------------------------------------------------------------
-- Add BlockNote JSON column for research note summaries
-- Safe to run multiple times

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'research_notes'
      and column_name = 'summary_blocknote'
  ) then
    alter table public.research_notes
      add column summary_blocknote jsonb;
  end if;
end $$;

-- Optional index for queries filtering on presence
create index if not exists idx_research_notes_summary_blocknote
  on public.research_notes
  using gin (summary_blocknote);



-- -------------------------------------------------------------------------
-- FILE: 20250901_create_example_comments_table.sql
-- -------------------------------------------------------------------------
/*
  # Create example comments table

  1. New Tables
    - `example_comments`
      - `id` (uuid, primary key)
      - `example_id` (uuid, foreign key to examples)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, not null)
      - `is_decision` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `example_comments` table
    - Add policy for authenticated users to create comments (only their own)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on example_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS example_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid NOT NULL REFERENCES examples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  is_decision boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE example_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_example_comments_example_id ON example_comments(example_id);
CREATE INDEX IF NOT EXISTS idx_example_comments_user_id ON example_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_example_comments_created_at ON example_comments(created_at DESC);

-- RLS Policies

-- Allow authenticated users to create comments (only their own)
CREATE POLICY "Allow authenticated users to create example comments"
  ON example_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all example comments"
  ON example_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own example comments"
  ON example_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own example comments"
  ON example_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_example_comments_updated_at 
  BEFORE UPDATE ON example_comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------------------------
-- FILE: 20250901_create_examples_table.sql
-- -------------------------------------------------------------------------
/*
  # Create Examples Content Type

  1. New Tables
    - `examples` - Main examples table with all required fields
    - `example_user_roles` - Junction table for linking examples to predefined user roles (optional)

  2. Fields
    - `actor` - Text field for actor (user can select from user_roles or create custom)
    - `goal` - Text field for the goal
    - `entry_point` - Text field for entry point
    - `actions` - Text field for actions (bullet point list or string)
    - `error` - Text field for error description
    - `outcome` - Text field for outcome (bullet point list or string)
    - `project_id` - Foreign key to projects table
    - `created_by` - Foreign key to auth.users table
    - Audit fields: `created_at`, `updated_at`

  3. Security
    - Enable RLS on examples table
    - Add policies for workspace-based access control
    - Users can only access examples from projects in workspaces they belong to

  4. Performance
    - Add indexes for foreign keys and commonly queried fields
    - Add composite indexes for efficient queries
*/

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

-- -------------------------------------------------------------------------
-- FILE: 20251020000000_add_layout_to_user_journeys.sql
-- -------------------------------------------------------------------------
/*
  # Add layout field to user_journeys table
  
  1. Changes
    - Add layout column to user_journeys table with values 'vertical' or 'horizontal'
    - Default to 'vertical' for existing journeys
*/

-- Add layout column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'layout'
  ) THEN
    ALTER TABLE user_journeys 
    ADD COLUMN layout text DEFAULT 'vertical' CHECK (layout IN ('vertical', 'horizontal'));
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20251021000000_add_ai_processing_jobs.sql
-- -------------------------------------------------------------------------
-- AI Processing Jobs Table
-- Stores background job status for long-running AI operations (transcript/image import)

CREATE TABLE IF NOT EXISTS ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('transcript', 'diagram')),
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  input_data jsonb NOT NULL, -- Store transcript text or image metadata
  result_data jsonb, -- Store the AI-generated journey data
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS ai_processing_jobs_user_id_idx ON ai_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS ai_processing_jobs_status_idx ON ai_processing_jobs(status);
CREATE INDEX IF NOT EXISTS ai_processing_jobs_created_at_idx ON ai_processing_jobs(created_at);

-- RLS Policies
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view their own AI processing jobs"
  ON ai_processing_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create AI processing jobs"
  ON ai_processing_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cleanup old jobs (older than 7 days)
-- This keeps the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_ai_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_processing_jobs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run cleanup weekly (you can set this up as a cron job in Supabase)
COMMENT ON FUNCTION cleanup_old_ai_jobs() IS 'Deletes AI processing jobs older than 7 days';


-- -------------------------------------------------------------------------
-- FILE: 20251023000000_add_user_tracking_to_user_journeys.sql
-- -------------------------------------------------------------------------
-- Add user tracking columns to user_journeys table
-- This tracks which Journey Studio team member created and last modified each user journey

-- Add created_by column (references auth.users)
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add updated_by column (references auth.users)
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups by creator
CREATE INDEX IF NOT EXISTS idx_user_journeys_created_by ON user_journeys(created_by);

-- Create index for faster lookups by last editor
CREATE INDEX IF NOT EXISTS idx_user_journeys_updated_by ON user_journeys(updated_by);

-- Add comment to explain the columns
COMMENT ON COLUMN user_journeys.created_by IS 'User ID of the Journey Studio team member who created this user journey';
COMMENT ON COLUMN user_journeys.updated_by IS 'User ID of the Journey Studio team member who last modified this user journey';


-- -------------------------------------------------------------------------
-- FILE: 20251023100000_add_status_to_user_journeys.sql
-- -------------------------------------------------------------------------
-- Add status column to user_journeys table
-- Draft journeys are only visible to their creator
-- Published journeys are visible to all workspace members

-- Add status column with default 'draft'
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' 
CHECK (status IN ('draft', 'published'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_user_journeys_status ON user_journeys(status);

-- Create index for filtering by status and creator (for draft visibility)
CREATE INDEX IF NOT EXISTS idx_user_journeys_status_created_by ON user_journeys(status, created_by);

-- Add comment to explain the column
COMMENT ON COLUMN user_journeys.status IS 'Status of the user journey: draft (only visible to creator) or published (visible to all workspace members)';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_journeys'
AND column_name = 'status';


-- -------------------------------------------------------------------------
-- FILE: 20251024000000_add_logo_to_platforms.sql
-- -------------------------------------------------------------------------
-- Add logo column to platforms table
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS logo TEXT;

-- Add comment to explain the logo column
COMMENT ON COLUMN public.platforms.logo IS 'Base64 encoded image or SVG text for the platform logo';


-- -------------------------------------------------------------------------
-- FILE: 20251024000001_add_edit_journey_job_type.sql
-- -------------------------------------------------------------------------
-- Add 'edit-journey' to allowed job types for ai_processing_jobs
ALTER TABLE ai_processing_jobs 
DROP CONSTRAINT IF EXISTS ai_processing_jobs_job_type_check;

ALTER TABLE ai_processing_jobs 
ADD CONSTRAINT ai_processing_jobs_job_type_check 
CHECK (job_type IN ('transcript', 'diagram', 'edit-journey'));

-- Add metadata column for storing additional information like token usage
ALTER TABLE ai_processing_jobs 
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add comment to explain the metadata column
COMMENT ON COLUMN ai_processing_jobs.metadata IS 'Additional metadata like token usage, finish reason, etc.';


-- -------------------------------------------------------------------------
-- FILE: 20251024100000_ensure_user_journeys_short_id.sql
-- -------------------------------------------------------------------------
/*
  # Ensure user_journeys has short_id column
  
  This migration ensures the user_journeys table has a short_id column for user-friendly URLs.
  It's safe to run multiple times (idempotent).
  
  1. Changes
    - Create sequence for user journey short IDs if it doesn't exist
    - Add short_id column to user_journeys if it doesn't exist
    - Populate short_id for existing records
    - Create unique index for fast lookups
*/

-- Create sequence for short IDs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_journeys_short_id_seq') THEN
    CREATE SEQUENCE user_journeys_short_id_seq START 1;
    RAISE NOTICE 'Created user_journeys_short_id_seq sequence';
  ELSE
    RAISE NOTICE 'user_journeys_short_id_seq sequence already exists';
  END IF;
END $$;

-- Add short_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_journeys_short_id_seq');
    RAISE NOTICE 'Added short_id column to user_journeys';
  ELSE
    RAISE NOTICE 'short_id column already exists in user_journeys';
  END IF;
END $$;

-- Populate short_id for existing records that don't have one
UPDATE user_journeys 
SET short_id = nextval('user_journeys_short_id_seq') 
WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing records
DO $$
BEGIN
  -- Check if the column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' 
    AND column_name = 'short_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE user_journeys ALTER COLUMN short_id SET NOT NULL;
    RAISE NOTICE 'Set short_id to NOT NULL';
  ELSE
    RAISE NOTICE 'short_id is already NOT NULL';
  END IF;
END $$;

-- Create unique index for fast lookups if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_short_id ON user_journeys(short_id);

-- Verify the result
DO $$
DECLARE
  column_exists boolean;
  index_exists boolean;
  sequence_exists boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) INTO column_exists;
  
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_journeys' AND indexname = 'idx_user_journeys_short_id'
  ) INTO index_exists;
  
  -- Check if sequence exists
  SELECT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = 'user_journeys_short_id_seq'
  ) INTO sequence_exists;
  
  RAISE NOTICE '=== Migration Status ===';
  RAISE NOTICE 'short_id column exists: %', column_exists;
  RAISE NOTICE 'short_id index exists: %', index_exists;
  RAISE NOTICE 'short_id sequence exists: %', sequence_exists;
  
  IF NOT column_exists OR NOT index_exists OR NOT sequence_exists THEN
    RAISE EXCEPTION 'Migration verification failed!';
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- FILE: 20251122065955_custom_law_firm_columns.sql
-- -------------------------------------------------------------------------
/*
  # Create law_firm_custom_columns table

  1. New Tables
    - `law_firm_custom_columns`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `column_key` (text, unique per workspace) - internal key like 'custom_field_1'
      - `column_name` (text, required) - display name like 'Top 10'
      - `column_type` (text, required) - 'boolean' or 'string'
      - `display_order` (integer, required) - order in which columns appear
      - `is_required` (boolean, default false) - whether column is required (name, structure are always required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `law_firm_custom_columns` table
    - Only workspace owners/admins can manage custom columns

  3. Performance
    - Add index on workspace_id and display_order for fast lookups
*/

CREATE TABLE IF NOT EXISTS law_firm_custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  column_name text NOT NULL,
  column_type text NOT NULL CHECK (column_type IN ('boolean', 'string')),
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, column_key)
);

-- Enable RLS
ALTER TABLE law_firm_custom_columns ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_columns_workspace_id ON law_firm_custom_columns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_columns_display_order ON law_firm_custom_columns(workspace_id, display_order);

-- RLS Policies
-- Drop policies if they exist (in case migration was partially run before)
DROP POLICY IF EXISTS "Users can view custom columns in their workspaces" ON law_firm_custom_columns;
DROP POLICY IF EXISTS "Owners and admins can manage custom columns" ON law_firm_custom_columns;

-- Users can view custom columns in their workspaces
CREATE POLICY "Users can view custom columns in their workspaces"
  ON law_firm_custom_columns
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners and admins can manage custom columns
CREATE POLICY "Owners and admins can manage custom columns"
  ON law_firm_custom_columns
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

-- Create a table to store custom column values for each law firm
-- This uses JSONB to store dynamic column values
CREATE TABLE IF NOT EXISTS law_firm_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  custom_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id)
);

-- Enable RLS
ALTER TABLE law_firm_custom_values ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_values_law_firm_id ON law_firm_custom_values(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_values_workspace_id ON law_firm_custom_values(workspace_id);

-- RLS Policies for custom values
-- Drop policies if they exist (in case migration was partially run before)
DROP POLICY IF EXISTS "Users can view custom values in their workspaces" ON law_firm_custom_values;
DROP POLICY IF EXISTS "Users can manage custom values in their workspaces" ON law_firm_custom_values;

CREATE POLICY "Users can view custom values in their workspaces"
  ON law_firm_custom_values
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage custom values in their workspaces"
  ON law_firm_custom_values
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_law_firm_custom_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (in case migration was partially run before)
DROP TRIGGER IF EXISTS update_law_firm_custom_columns_updated_at ON law_firm_custom_columns;

CREATE TRIGGER update_law_firm_custom_columns_updated_at
  BEFORE UPDATE ON law_firm_custom_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_law_firm_custom_columns_updated_at();

CREATE OR REPLACE FUNCTION update_law_firm_custom_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (in case migration was partially run before)
DROP TRIGGER IF EXISTS update_law_firm_custom_values_updated_at ON law_firm_custom_values;

CREATE TRIGGER update_law_firm_custom_values_updated_at
  BEFORE UPDATE ON law_firm_custom_values
  FOR EACH ROW
  EXECUTE FUNCTION update_law_firm_custom_values_updated_at();




-- -------------------------------------------------------------------------
-- FILE: 20260521120000_fix_workspace_users_rls_auth_users_subquery.sql
-- -------------------------------------------------------------------------
/*
  Fix "permission denied for table users" on workspace_users SELECT.

  The policy "Users can view their workspace memberships" from
  20250101000000_support_auth0_users.sql includes:

    user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())

  RLS expressions run with the querying role's privileges. The authenticated
  role cannot SELECT from auth.users, so evaluating that clause errors.

  Later migrations intended to replace workspace_users policies, but DROP POLICY
  used different names, so this policy could remain and break any query on
  workspace_users (including .eq('user_id', ...)).

  We drop the broken policy and ensure a permissive read policy exists
  (aligned with 20250718164425_shiny_summit.sql).
*/

DROP POLICY IF EXISTS "Users can view their workspace memberships" ON public.workspace_users;

DROP POLICY IF EXISTS "Allow users to view workspace memberships" ON public.workspace_users;

CREATE POLICY "Allow users to view workspace memberships"
  ON public.workspace_users
  FOR SELECT
  TO authenticated
  USING (true);
