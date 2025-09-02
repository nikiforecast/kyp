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
