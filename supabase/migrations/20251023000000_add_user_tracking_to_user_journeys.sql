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

