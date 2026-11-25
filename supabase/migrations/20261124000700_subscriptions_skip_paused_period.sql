-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: subscriptions_skip_paused_period).
-- Resuming a paused subscription used to charge every period it was paused
-- (process_due_subscriptions catches up from next_charge_on). Now, on resume, the
-- schedule skips to the first pending charge on or after today.
create or replace function public.subscriptions_sync_next_charge()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_guard integer := 0;
begin
  if tg_op = 'UPDATE' then
    if new.frequency <> old.frequency
      and new.anchor_on = old.anchor_on
      and new.charged_count = old.charged_count then
      new.anchor_on := old.next_charge_on;
    end if;
    if new.anchor_on <> old.anchor_on or new.frequency <> old.frequency then
      new.charged_count := 0;
    end if;
    if new.is_active and not old.is_active then
      while public.subscription_charge_date(new.anchor_on, new.frequency, new.charged_count) < current_date
        and v_guard < 600 loop
        new.charged_count := new.charged_count + 1;
        v_guard := v_guard + 1;
      end loop;
    end if;
  end if;
  new.next_charge_on := public.subscription_charge_date(new.anchor_on, new.frequency, new.charged_count);
  return new;
end;
$$;
