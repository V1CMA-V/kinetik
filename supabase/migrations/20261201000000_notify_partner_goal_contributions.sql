-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: notify_partner_goal_contributions).
-- Push notifications when a partner contributes to (or withdraws from) a shared goal.
-- Reuses the notify-partner Edge Function and its Vault secrets.

create or replace function public.notify_partner_on_goal_contribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Only goals shared with someone else in the household.
  if not exists (
    select 1
    from public.goals g
    join public.household_members m
      on m.household_id = g.household_id and m.user_id <> new.user_id
    where g.id = new.goal_id
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
    body := jsonb_build_object('contribution_id', new.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    )
  );
  return new;
exception when others then
  raise warning 'notify_partner_on_goal_contribution: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_partner_on_goal_contribution() from public, anon, authenticated;

create trigger goal_contributions_notify_partner
  after insert on public.goal_contributions
  for each row execute function public.notify_partner_on_goal_contribution();
