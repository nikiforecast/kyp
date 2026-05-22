-- Remove the seeded "Legl" platform from all workspaces.
DELETE FROM public.platforms
WHERE LOWER(TRIM(name)) = 'legl';
