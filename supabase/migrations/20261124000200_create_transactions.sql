-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_transactions).
create type public.transaction_kind as enum ('expense', 'income', 'transfer');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  account_id uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  category text check (category is null or char_length(category) between 1 and 40),
  description text check (description is null or char_length(description) <= 120),
  occurred_on date not null default current_date,
  installment_months smallint check (installment_months in (3, 6, 9, 12, 18, 24)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_transfer_target check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id)
    or (kind <> 'transfer' and to_account_id is null)
  ),
  constraint transactions_installments_only_expenses check (
    installment_months is null or kind = 'expense'
  )
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_to_account_id_idx on public.transactions (to_account_id);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create transactions on their own accounts"
  on public.transactions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (to_account_id is null or exists (
      select 1 from public.accounts a where a.id = to_account_id and a.user_id = (select auth.uid())
    ))
  );

create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (to_account_id is null or exists (
      select 1 from public.accounts a where a.id = to_account_id and a.user_id = (select auth.uid())
    ))
  );

create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- MSI only makes sense on credit cards.
create or replace function public.validate_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.installment_months is not null and (
    select type from public.accounts where id = new.account_id
  ) <> 'credit_card' then
    raise exception 'Meses sin intereses solo aplica a tarjetas de crédito';
  end if;
  return new;
end;
$$;

create trigger transactions_validate
  before insert or update on public.transactions
  for each row execute function public.validate_transaction();

-- Keeps accounts.balance in sync. Credit-card debt is a negative balance,
-- so an expense makes it more negative and a transfer (payment) raises it.
create or replace function public.apply_transaction_to_balances()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.accounts
      set balance = balance + case when old.kind = 'income' then -old.amount else old.amount end
      where id = old.account_id;
    if old.kind = 'transfer' then
      update public.accounts set balance = balance - old.amount where id = old.to_account_id;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.accounts
      set balance = balance + case when new.kind = 'income' then new.amount else -new.amount end
      where id = new.account_id;
    if new.kind = 'transfer' then
      update public.accounts set balance = balance + new.amount where id = new.to_account_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger transactions_apply_to_balances
  after insert or update or delete on public.transactions
  for each row execute function public.apply_transaction_to_balances();
