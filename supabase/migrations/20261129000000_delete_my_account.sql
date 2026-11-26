-- In-app account deletion (App Store guideline 5.1.1(v), Google Play account deletion policy).
-- Deletes the signed-in user and everything they own. Data shared with a partner is handled
-- so the partner's balances never change:
--   * A movement between one of your accounts and one of theirs is kept on their side
--     (a payment from their debit into your card becomes an expense on their debit; money
--     from your account into theirs becomes income on theirs).
--   * Movements and subscriptions you recorded on their accounts become theirs.
--   * Your partner stays in the household and becomes its owner.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_household uuid;
  v_partner uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Money that left someone else's account into one of yours: an expense on theirs.
  update public.transactions t
    set kind = 'expense',
        to_account_id = null,
        user_id = other.user_id,
        category = coalesce(t.category, 'Otros')
    from public.accounts mine, public.accounts other
    where t.to_account_id = mine.id and mine.user_id = v_uid
      and t.account_id = other.id and other.user_id <> v_uid;

  -- Money that left one of your accounts into someone else's: income on theirs.
  update public.transactions t
    set kind = 'income',
        account_id = t.to_account_id,
        to_account_id = null,
        installment_months = null,
        user_id = other.user_id,
        category = coalesce(t.category, 'Otros')
    from public.accounts mine, public.accounts other
    where t.account_id = mine.id and mine.user_id = v_uid
      and t.to_account_id = other.id and other.user_id <> v_uid;

  -- What you recorded on someone else's accounts now belongs to the account owner.
  update public.transactions t
    set user_id = a.user_id
    from public.accounts a
    where t.user_id = v_uid and t.account_id = a.id and a.user_id <> v_uid;

  update public.subscriptions s
    set user_id = a.user_id
    from public.accounts a
    where s.user_id = v_uid and s.account_id = a.id and a.user_id <> v_uid;

  -- Whatever is left on your accounts (by anyone) goes away with them. Deleting the
  -- movements first keeps the RESTRICT foreign keys from blocking the account deletion.
  delete from public.transactions t
    using public.accounts a
    where a.user_id = v_uid and (t.account_id = a.id or t.to_account_id = a.id);

  delete from public.subscriptions s
    using public.accounts a
    where s.account_id = a.id and a.user_id = v_uid;

  -- The partner keeps the household (it would otherwise cascade away with its creator).
  select m.household_id into v_household from public.household_members m where m.user_id = v_uid;
  if v_household is not null then
    select m.user_id into v_partner
      from public.household_members m
      where m.household_id = v_household and m.user_id <> v_uid
      order by m.joined_at
      limit 1;

    if v_partner is not null then
      update public.households h set created_by = v_partner
        where h.id = v_household and h.created_by = v_uid;
      update public.household_members m set role = 'owner'
        where m.household_id = v_household and m.user_id = v_partner;
      delete from public.household_invites i
        where i.household_id = v_household and i.created_by = v_uid;
    end if;
  end if;

  -- Cascades to accounts, budgets, goals, contributions, profile, membership and push tokens.
  delete from auth.users u where u.id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
