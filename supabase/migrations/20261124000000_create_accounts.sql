-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_accounts).
create type public.account_type as enum ('debit', 'credit', 'bank', 'cash');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type public.account_type not null,
  balance numeric(14, 2) not null default 0,
  credit_limit numeric(14, 2) check (credit_limit is null or credit_limit >= 0),
  currency char(3) not null default 'MXN',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "Users can view their own accounts"
  on public.accounts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own accounts"
  on public.accounts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own accounts"
  on public.accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own accounts"
  on public.accounts for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();
