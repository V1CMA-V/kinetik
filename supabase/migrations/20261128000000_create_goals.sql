-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_goals).
-- Savings goals (a trip, a down payment…), personal or shared with the household.
-- Progress comes from contributions each person registers; no money moves between accounts.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- null = personal goal.
  household_id uuid references public.households (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);
create index goals_household_id_idx on public.goals (household_id);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Positive = contribution, negative = withdrawal.
  amount numeric(14, 2) not null check (amount <> 0),
  contributed_on date not null default current_date,
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now()
);

create index goal_contributions_goal_id_idx on public.goal_contributions (goal_id);
create index goal_contributions_user_id_idx on public.goal_contributions (user_id);

-- ---------------------------------------------------------------------------
-- Helper (security definer so the contributions policies don't recurse into goals RLS)
-- ---------------------------------------------------------------------------
create or replace function public.can_access_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.goals g
    where g.id = p_goal_id
      and (g.user_id = (select auth.uid()) or public.is_household_member(g.household_id))
  );
$$;

revoke execute on function public.can_access_goal(uuid) from public, anon;
grant execute on function public.can_access_goal(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "Users can view their own and shared goals"
  on public.goals for select to authenticated
  using ((select auth.uid()) = user_id or public.is_household_member(household_id));

create policy "Users can create their own goals"
  on public.goals for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (household_id is null or public.is_household_member(household_id))
  );

-- Both members edit a shared goal; only the owner can share or unshare it (trigger below).
create policy "Users can update their own and shared goals"
  on public.goals for update to authenticated
  using ((select auth.uid()) = user_id or public.is_household_member(household_id))
  with check (
    ((select auth.uid()) = user_id or public.is_household_member(household_id))
    and (household_id is null or public.is_household_member(household_id))
  );

create policy "Users can delete their own goals"
  on public.goals for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view contributions to their goals"
  on public.goal_contributions for select to authenticated
  using (public.can_access_goal(goal_id));

create policy "Users can add their own contributions"
  on public.goal_contributions for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_access_goal(goal_id));

create policy "Users can update their own contributions"
  on public.goal_contributions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.can_access_goal(goal_id));

create policy "Users can delete their own contributions"
  on public.goal_contributions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- The owner never changes, and only the owner moves a goal in or out of the household.
create or replace function public.guard_goal_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'goal_owner_immutable';
  end if;
  if new.household_id is distinct from old.household_id
     and old.user_id is distinct from (select auth.uid())
     and (select auth.uid()) is not null then
    raise exception 'goal_share_owner_only';
  end if;
  return new;
end;
$$;

create trigger goals_guard_ownership
  before update on public.goals
  for each row execute function public.guard_goal_ownership();

-- ---------------------------------------------------------------------------
-- Leaving the household: the goals you created become personal again.
-- ---------------------------------------------------------------------------
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household uuid;
begin
  select m.household_id into v_household from public.household_members m where m.user_id = v_uid;
  if v_household is null then
    return;
  end if;

  update public.accounts set household_id = null
    where user_id = v_uid and household_id = v_household;

  update public.goals set household_id = null
    where user_id = v_uid and household_id = v_household;

  delete from public.household_members m where m.household_id = v_household and m.user_id = v_uid;

  if not exists (select 1 from public.household_members m where m.household_id = v_household) then
    delete from public.households h where h.id = v_household;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime (respects RLS)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.goals, public.goal_contributions;
