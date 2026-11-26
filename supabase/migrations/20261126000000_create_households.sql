-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: create_households).
-- Couples: a household of up to two members who can share accounts with each other.

-- ---------------------------------------------------------------------------
-- Profiles: public display name, so a partner can see who registered a movement.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 60))
  on conflict (id) do update
    set display_name = excluded.display_name, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_profile_sync
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();

insert into public.profiles (id, display_name)
select id, left(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 60)
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Households, members and invite codes
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  -- One household per user.
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_invites (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index household_invites_household_id_idx on public.household_invites (household_id);

alter table public.accounts
  add column household_id uuid references public.households (id) on delete set null;

create index accounts_household_id_idx on public.accounts (household_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can use them without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_household_id is not null and exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = (select auth.uid())
  );
$$;

-- Owner of the account, or member of the household it is shared with.
create or replace function public.can_access_account(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = p_account_id
      and (a.user_id = (select auth.uid()) or public.is_household_member(a.household_id))
  );
$$;

-- The given user shares a household with the current user (or is the current user).
create or replace function public.is_partner(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = (select auth.uid()) or exists (
    select 1
    from public.household_members me
    join public.household_members them on them.household_id = me.household_id
    where me.user_id = (select auth.uid()) and them.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create policy "Users can view their own and their partner's profile"
  on public.profiles for select to authenticated
  using (public.is_partner(id));

create policy "Members can view their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "Members can view their household members"
  on public.household_members for select to authenticated
  using (public.is_household_member(household_id));

create policy "Members can view their household invites"
  on public.household_invites for select to authenticated
  using (public.is_household_member(household_id));

-- Accounts: shared ones are visible to the household; only the owner changes them.
drop policy "Users can view their own accounts" on public.accounts;
create policy "Users can view their own and shared accounts"
  on public.accounts for select to authenticated
  using ((select auth.uid()) = user_id or public.is_household_member(household_id));

drop policy "Users can update their own accounts" on public.accounts;
create policy "Users can update their own accounts"
  on public.accounts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (household_id is null or public.is_household_member(household_id))
  );

drop policy "Users can create their own accounts" on public.accounts;
create policy "Users can create their own accounts"
  on public.accounts for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (household_id is null or public.is_household_member(household_id))
  );

-- Transactions: visible on any accessible account; each user edits only their own.
drop policy "Users can view their own transactions" on public.transactions;
create policy "Users can view transactions on their own and shared accounts"
  on public.transactions for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.can_access_account(account_id)
    or (to_account_id is not null and public.can_access_account(to_account_id))
  );

drop policy "Users can create transactions on their own accounts" on public.transactions;
create policy "Users can create transactions on their own and shared accounts"
  on public.transactions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.can_access_account(account_id)
    and (to_account_id is null or public.can_access_account(to_account_id))
  );

drop policy "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and public.can_access_account(account_id)
    and (to_account_id is null or public.can_access_account(to_account_id))
  );

-- A partner's movement must update the owner's balance, which RLS would block.
alter function public.apply_transaction_to_balances() security definer;

-- ---------------------------------------------------------------------------
-- RPCs (all writes to households go through these)
-- ---------------------------------------------------------------------------
create or replace function public.create_household_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household uuid;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := now() + interval '48 hours';
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select m.household_id into v_household from public.household_members m where m.user_id = v_uid;

  if v_household is null then
    insert into public.households (created_by) values (v_uid) returning id into v_household;
    insert into public.household_members (household_id, user_id, role)
      values (v_household, v_uid, 'owner');
  elsif (select count(*) from public.household_members m where m.household_id = v_household) >= 2 then
    raise exception 'household_full';
  end if;

  -- Only one active code at a time.
  delete from public.household_invites i where i.household_id = v_household and i.used_at is null;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.household_invites i where i.code = v_code);
  end loop;

  insert into public.household_invites (code, household_id, created_by, expires_at)
    values (v_code, v_household, v_uid, v_expires);

  return query select v_code, v_expires;
end;
$$;

create or replace function public.accept_household_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.household_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.household_invites i
    where i.code = upper(btrim(p_code))
    for update;

  if not found or v_invite.used_at is not null then
    raise exception 'invalid_code';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'expired_code';
  end if;
  if exists (select 1 from public.household_members m where m.user_id = v_uid) then
    raise exception 'already_in_household';
  end if;
  if (select count(*) from public.household_members m where m.household_id = v_invite.household_id) >= 2 then
    raise exception 'household_full';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (v_invite.household_id, v_uid, 'member');

  update public.household_invites
    set used_by = v_uid, used_at = now()
    where code = v_invite.code;

  return v_invite.household_id;
end;
$$;

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

  -- The accounts this user shared become private again.
  update public.accounts set household_id = null
    where user_id = v_uid and household_id = v_household;

  delete from public.household_members m where m.household_id = v_household and m.user_id = v_uid;

  if not exists (select 1 from public.household_members m where m.household_id = v_household) then
    delete from public.households h where h.id = v_household;
  end if;
end;
$$;

revoke execute on function public.create_household_invite() from public, anon;
revoke execute on function public.accept_household_invite(text) from public, anon;
revoke execute on function public.leave_household() from public, anon;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
