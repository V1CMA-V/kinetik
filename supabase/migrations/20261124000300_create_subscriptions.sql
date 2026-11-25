-- Applied to project apktevzfdgritpmqhrir via Supabase MCP
-- (migrations: create_subscriptions, subscriptions_next_charge_default).
create type public.billing_frequency as enum ('monthly', 'quarterly', 'yearly');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  amount numeric(14, 2) not null check (amount > 0),
  frequency public.billing_frequency not null,
  account_id uuid not null references public.accounts (id) on delete restrict,
  category text not null default 'Suscripciones' check (char_length(category) between 1 and 40),
  -- First charge date; later charges are anchor + n * period, so the billing day never drifts.
  anchor_on date not null,
  charged_count integer not null default 0 check (charged_count >= 0),
  -- Computed by the subscriptions_sync_next_charge trigger; the default only makes it optional on insert.
  next_charge_on date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_account_id_idx on public.subscriptions (account_id);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create subscriptions on their own accounts"
  on public.subscriptions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );

create policy "Users can update their own subscriptions"
  on public.subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );

create policy "Users can delete their own subscriptions"
  on public.subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.subscription_charge_date(
  p_anchor date, p_frequency public.billing_frequency, p_n integer
)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_anchor + case p_frequency
    when 'monthly' then make_interval(months => p_n)
    when 'quarterly' then make_interval(months => 3 * p_n)
    else make_interval(years => p_n)
  end)::date;
$$;

-- Keep next_charge_on consistent with anchor/count on insert and when the schedule changes.
create or replace function public.subscriptions_sync_next_charge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.anchor_on <> old.anchor_on or new.frequency <> old.frequency) then
    new.charged_count := 0;
  end if;
  new.next_charge_on := public.subscription_charge_date(new.anchor_on, new.frequency, new.charged_count);
  return new;
end;
$$;

create trigger subscriptions_sync_next_charge
  before insert or update on public.subscriptions
  for each row execute function public.subscriptions_sync_next_charge();

-- Link generated charges to their subscription.
alter table public.transactions
  add column subscription_id uuid references public.subscriptions (id) on delete set null;

create index transactions_subscription_id_idx on public.transactions (subscription_id);
create unique index transactions_subscription_charge_unique
  on public.transactions (subscription_id, occurred_on)
  where subscription_id is not null;

-- Registers every due charge (up to p_today) for the calling user's active subscriptions.
-- Runs with the caller's privileges, so RLS limits it to their own data.
create or replace function public.process_due_subscriptions(p_today date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_today date := least(p_today, current_date + 1);
  v_sub public.subscriptions%rowtype;
  v_created integer := 0;
  v_guard integer;
begin
  for v_sub in
    select * from public.subscriptions
    where is_active and next_charge_on <= v_today and user_id = (select auth.uid())
    for update
  loop
    v_guard := 0;
    while v_sub.next_charge_on <= v_today and v_guard < 120 loop
      insert into public.transactions
        (user_id, kind, account_id, amount, category, description, occurred_on, subscription_id)
      values
        (v_sub.user_id, 'expense', v_sub.account_id, v_sub.amount, v_sub.category, v_sub.name,
         v_sub.next_charge_on, v_sub.id)
      on conflict (subscription_id, occurred_on) where subscription_id is not null do nothing;

      if found then
        v_created := v_created + 1;
      end if;

      v_sub.charged_count := v_sub.charged_count + 1;
      v_sub.next_charge_on := public.subscription_charge_date(
        v_sub.anchor_on, v_sub.frequency, v_sub.charged_count
      );
      v_guard := v_guard + 1;
    end loop;

    update public.subscriptions
      set charged_count = v_sub.charged_count
      where id = v_sub.id;
  end loop;

  return v_created;
end;
$$;

revoke execute on function public.process_due_subscriptions(date) from public, anon;
grant execute on function public.process_due_subscriptions(date) to authenticated;
