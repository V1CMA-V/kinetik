-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_income_profiles).
-- Optional income profile: how much you get paid and when. Private to its owner
-- (never visible to the household partner, unlike public.profiles).

create type public.pay_frequency as enum ('weekly', 'biweekly', 'semimonthly', 'monthly');

create table public.income_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Net amount received on each payday (what reaches the account, not gross).
  pay_amount numeric(14, 2) not null check (pay_amount > 0),
  pay_frequency public.pay_frequency not null,
  -- semimonthly / monthly: day of the month (31 = last day; shorter months clamp).
  pay_day_1 smallint check (pay_day_1 between 1 and 31),
  -- semimonthly only: second payday, after the first.
  pay_day_2 smallint check (pay_day_2 between 1 and 31),
  -- weekly / biweekly: any past or future payday; the cadence is counted from it.
  anchor_date date,
  -- Account where the pay is deposited (optional).
  deposit_account_id uuid references public.accounts (id) on delete set null,
  -- Estimated monthly extra income (freelance, bonuses). Never used in conservative projections.
  variable_monthly numeric(14, 2) not null default 0 check (variable_monthly >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_profiles_schedule_check check (
    case pay_frequency
      when 'monthly' then pay_day_1 is not null and pay_day_2 is null and anchor_date is null
      when 'semimonthly' then pay_day_1 is not null and pay_day_2 is not null
        and pay_day_1 < pay_day_2 and anchor_date is null
      else anchor_date is not null and pay_day_1 is null and pay_day_2 is null
    end
  )
);

create index income_profiles_deposit_account_id_idx on public.income_profiles (deposit_account_id);

alter table public.income_profiles enable row level security;

create policy "Users can view their own income profile"
  on public.income_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own income profile"
  on public.income_profiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    -- Accounts RLS applies inside: only an account you can see can receive the pay.
    and (deposit_account_id is null
      or exists (select 1 from public.accounts a where a.id = deposit_account_id))
  );

create policy "Users can update their own income profile"
  on public.income_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (deposit_account_id is null
      or exists (select 1 from public.accounts a where a.id = deposit_account_id))
  );

create policy "Users can delete their own income profile"
  on public.income_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger income_profiles_set_updated_at
  before update on public.income_profiles
  for each row execute function public.set_updated_at();
