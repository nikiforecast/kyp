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
DO $$
BEGIN
  ALTER TABLE workspace_users ADD CONSTRAINT user_id_or_pending_check
    CHECK (user_id IS NOT NULL OR status = 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;