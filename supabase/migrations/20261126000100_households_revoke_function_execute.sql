-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: households_revoke_function_execute).
-- Trigger functions are never called directly; privileges are only checked when the trigger is created.
revoke execute on function public.apply_transaction_to_balances() from public, anon, authenticated;
revoke execute on function public.sync_profile_from_auth() from public, anon, authenticated;
-- RLS helpers: needed by signed-in users (policies run as them), never by anon.
revoke execute on function public.is_household_member(uuid) from public, anon;
revoke execute on function public.can_access_account(uuid) from public, anon;
revoke execute on function public.is_partner(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;
grant execute on function public.is_partner(uuid) to authenticated;
