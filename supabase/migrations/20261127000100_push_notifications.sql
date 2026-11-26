-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: push_notifications).
-- Push notifications when a partner registers a movement on a shared account.
--
-- Requires two Vault secrets (created outside migrations so they never reach the repo):
--   select vault.create_secret('https://<project>.supabase.co/functions/v1/notify-partner', 'notify_partner_url');
--   select vault.create_secret('<random hex>', 'notify_partner_secret');
-- The Edge Function validates it with public.check_notify_partner_secret (next migration).

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Expo push tokens, one row per phone
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users can view their own push tokens"
  on public.push_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Upsert through an RPC: the same phone may move to another user after signing out.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, v_uid, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = (select auth.uid());
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Preference: notify me about my partner's movements
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column notify_partner_activity boolean not null default true;

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Only the preference is editable; the name comes from Auth.
revoke update on public.profiles from authenticated, anon;
grant update (notify_partner_activity) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: call the notify-partner Edge Function for movements on shared accounts
-- ---------------------------------------------------------------------------
create or replace function public.notify_partner_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Only movements on an account shared with someone else in the household.
  if not exists (
    select 1
    from public.accounts a
    join public.household_members m
      on m.household_id = a.household_id and m.user_id <> new.user_id
    where a.id = new.account_id or a.id = new.to_account_id
  ) then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_partner_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_partner_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  -- Asynchronous: the insert never waits for (or fails because of) the notification.
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('transaction_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    )
  );
  return new;
exception when others then
  raise warning 'notify_partner_on_transaction: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_partner_on_transaction() from public, anon, authenticated;

create trigger transactions_notify_partner
  after insert on public.transactions
  for each row execute function public.notify_partner_on_transaction();
