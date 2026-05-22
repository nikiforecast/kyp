-- Add user tracking columns to user_journeys table
-- Run this in the Supabase SQL Editor

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

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_journeys' 
AND column_name IN ('created_by', 'updated_by');

