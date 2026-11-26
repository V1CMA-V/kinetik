-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: realtime_shared_data).
-- Realtime respects RLS: each user only receives their own rows and the ones shared with them.
alter publication supabase_realtime add table public.transactions, public.accounts, public.household_members;
