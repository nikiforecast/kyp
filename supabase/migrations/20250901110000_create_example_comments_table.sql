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
