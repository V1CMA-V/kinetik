-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: accounts_statement_cycle).
-- Credit-card statement cycle: día de corte and día límite de pago. Days that don't
-- exist in a month (e.g. 31 in February) are clamped to its last day by the app.
alter table public.accounts
  add column statement_day smallint check (statement_day between 1 and 31),
  add column payment_due_day smallint check (payment_due_day between 1 and 31);

alter table public.accounts
  add constraint accounts_statement_cycle_only_for_cards
  check ((statement_day is null and payment_due_day is null) or type = 'credit_card');
