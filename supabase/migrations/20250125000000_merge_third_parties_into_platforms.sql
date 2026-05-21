-- Migration to merge third_parties into platforms table
-- This migration:
-- 1. Migrates all third_parties data to platforms (if not already exists)
-- 2. Sets default values for platforms fields (colour, icon, description) for migrated third parties

-- logo is added permanently in 20251024000000; ensure it exists before merge INSERT
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS logo TEXT;

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

