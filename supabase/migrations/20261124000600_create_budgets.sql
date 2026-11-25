-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_budgets).
-- Monthly spending limit per expense category; the same limit applies every month.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 40),
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One limit per category; its leading user_id column also serves the RLS lookups.
  constraint budgets_user_id_category_key unique (user_id, category)
);

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own budgets"
  on public.budgets for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();
