// Sends a push notification to the other household member when someone registers a
// movement on a shared account. Called by the `transactions_notify_partner` trigger
// (pg_net) with `{ transaction_id }` and the `x-webhook-secret` header.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHANNEL_ID = 'partner-activity';

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // The secret lives in Vault; only the service role can check it.
  const secret = req.headers.get('x-webhook-secret') ?? '';
  const { data: valid } = await supabase.rpc('check_notify_partner_secret', { p_secret: secret });
  if (!secret || !valid) return json({ error: 'unauthorized' }, 401);

  const { transaction_id: transactionId } = await req.json().catch(() => ({}));
  if (typeof transactionId !== 'string') return json({ error: 'missing_transaction_id' }, 400);

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id, user_id, kind, amount, category, description, account_id, to_account_id')
    .eq('id', transactionId)
    .maybeSingle();
  if (txError) return json({ error: txError.message }, 500);
  if (!tx) return json({ sent: 0, reason: 'transaction_not_found' });

  // The shared account involved (for transfers, whichever side is shared).
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, currency, household_id')
    .in('id', [tx.account_id, tx.to_account_id].filter(Boolean))
    .not('household_id', 'is', null);
  if (accountsError) return json({ error: accountsError.message }, 500);
  const shared = accounts?.find((a) => a.id === tx.account_id) ?? accounts?.[0];
  if (!shared) return json({ sent: 0, reason: 'not_shared' });

  const { data: members } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', shared.household_id)
    .neq('user_id', tx.user_id);
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (!memberIds.length) return json({ sent: 0, reason: 'no_partner' });

  const [{ data: profiles }, { data: author }] = await Promise.all([
    supabase.from('profiles').select('id, notify_partner_activity').in('id', memberIds),
    supabase.from('profiles').select('display_name').eq('id', tx.user_id).maybeSingle(),
  ]);
  const recipients = memberIds.filter(
    (id) => profiles?.find((p) => p.id === id)?.notify_partner_activity !== false,
  );
  if (!recipients.length) return json({ sent: 0, reason: 'muted' });

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', recipients);
  if (!tokens?.length) return json({ sent: 0, reason: 'no_tokens' });

  const name = author?.display_name ?? 'Tu pareja';
  const action =
    tx.kind === 'income'
      ? 'registró un ingreso'
      : tx.kind === 'transfer'
        ? 'registró una transferencia'
        : 'registró un gasto';
  const detail = tx.description || tx.category;
  const body = `${money(Number(tx.amount), shared.currency.trim())} en ${shared.name}${detail ? ` · ${detail}` : ''}`;

  const messages = tokens.map(({ token }) => ({
    to: token,
    title: `${name} ${action}`,
    body,
    sound: 'default',
    channelId: CHANNEL_ID,
    data: { kind: 'partner-transaction', transactionId: tx.id },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
  if (!response.ok || !result?.data) {
    console.error('Expo push failed', response.status, JSON.stringify(result));
    return json({ error: 'expo_push_failed' }, 502);
  }

  // Forget phones that uninstalled the app or revoked notifications.
  const stale = result.data
    .map((ticket, i) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? messages[i].to
        : null,
    )
    .filter((t): t is string => t !== null);
  if (stale.length) await supabase.from('push_tokens').delete().in('token', stale);

  return json({ sent: messages.length - stale.length });
});
