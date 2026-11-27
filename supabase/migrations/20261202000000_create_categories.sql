-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_categories).
-- Custom expense / income categories added on top of the built-in lists in the app.
-- Private to their owner (not shared with the household partner). transactions.category and
-- budgets.category stay free text, so deleting a category never changes existing rows.
-- Covered by delete_my_account through the cascade on auth.users.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Transfers have no category.
  kind public.transaction_kind not null check (kind in ('expense', 'income')),
  -- Same limit as budgets.category; stored trimmed.
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  created_at timestamptz not null default now()
);

-- One category per name and kind, ignoring case. Its leading user_id column also serves
-- the RLS lookups.
create unique index categories_user_id_kind_name_key
  on public.categories (user_id, kind, lower(name));

alter table public.categories enable row level security;

create policy "Users can view their own categories"
  on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own categories"
  on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own categories"
  on public.categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);
