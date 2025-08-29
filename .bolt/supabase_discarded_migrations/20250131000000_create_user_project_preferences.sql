/*
  # Create User Project Preferences Table

  1. New Tables
    - `user_project_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `project_id` (uuid, foreign key to projects)
      - `order_position` (integer, for custom ordering)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_project_preferences table
    - Add policy for users to manage their own preferences only

  3. Performance
    - Add indexes for user_id and project_id for fast lookups
    - Add unique constraint on user_id + project_id

  4. Features
    - Allows users to customize project order per their preference
    - Each user can have their own ordering independent of others
*/

-- Create user_project_preferences table
CREATE TABLE IF NOT EXISTS user_project_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE user_project_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own preferences only
CREATE POLICY "Users can manage their own project preferences"
  ON user_project_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_id ON user_project_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_project_id ON user_project_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_order ON user_project_preferences(user_id, order_position);
