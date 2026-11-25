-- Applied to project apktevzfdgritpmqhrir via Supabase MCP
-- (migration: subscriptions_reanchor_on_frequency_change).
-- Changing only the frequency used to restart the schedule from the original anchor
-- (possibly months ago), so process_due_subscriptions created bogus past charges.
-- Now the new schedule starts at the pending charge date instead. A client that moves
-- the date sends anchor_on (and charged_count = 0), which still resets from that date.
create or replace function public.subscriptions_sync_next_charge()
returns trigger
language plpgsql
set search_path = ''
as $$
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
  end if;
  new.next_charge_on := public.subscription_charge_date(new.anchor_on, new.frequency, new.charged_count);
  return new;
end;
$$;
