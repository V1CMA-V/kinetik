-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: notify_partner_secret_check).
-- Lets the notify-partner Edge Function validate the webhook secret against Vault
-- (only callable with the service role key, which Edge Functions get by default).
create or replace function public.check_notify_partner_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'notify_partner_secret' and decrypted_secret = p_secret
  );
$$;

revoke execute on function public.check_notify_partner_secret(text) from public, anon, authenticated;
grant execute on function public.check_notify_partner_secret(text) to service_role;
