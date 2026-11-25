-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: accounts_types_and_institution).
-- Replaces debit/credit/bank/cash with clearer types and adds the bank/institution name.
create type public.account_type_v2 as enum ('bank_account', 'credit_card', 'cash', 'investment');

alter table public.accounts
  alter column type type public.account_type_v2
  using (
    case type::text
      when 'debit' then 'bank_account'
      when 'bank' then 'bank_account'
      when 'credit' then 'credit_card'
      else 'cash'
    end
  )::public.account_type_v2;

drop type public.account_type;
alter type public.account_type_v2 rename to account_type;

alter table public.accounts
  add column institution text check (institution is null or char_length(institution) between 1 and 40);

alter table public.accounts
  add constraint accounts_credit_limit_only_for_cards
  check (credit_limit is null or type = 'credit_card');
