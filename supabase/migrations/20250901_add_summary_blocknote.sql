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


