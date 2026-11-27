// Sends a push notification to the other household member when someone registers a
// movement on a shared account or a contribution to a shared goal. Called by the
// `transactions_notify_partner` and `goal_contributions_notify_partner` triggers (pg_net)
// with `{ transaction_id }` or `{ contribution_id }` and the `x-webhook-secret` header.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHANNEL_ID = 'partner-activity';

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

type Notification = {
  householdId: string;
  authorId: string;
  /** Builds the title from the author's name. */
  title: (name: string) => string;
  body: string;
  data: Record<string, string>;
};

type Outcome = { notification: Notification } | { skip: string } | { error: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);

async function transactionNotification(supabase: SupabaseClient, id: string): Promise<Outcome> {
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('id, user_id, kind, amount, category, description, account_id, to_account_id')
    .eq('id', id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!tx) return { skip: 'transaction_not_found' };

  // The shared account involved (for transfers, whichever side is shared).
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, currency, household_id')
    .in('id', [tx.account_id, tx.to_account_id].filter(Boolean))
    .not('household_id', 'is', null);
  if (accountsError) return { error: accountsError.message };
  const shared = accounts?.find((a) => a.id === tx.account_id) ?? accounts?.[0];
  if (!shared) return { skip: 'not_shared' };

  const action =
    tx.kind === 'income'
      ? 'registró un ingreso'
      : tx.kind === 'transfer'
        ? 'registró una transferencia'
        : 'registró un gasto';
  const detail = tx.description || tx.category;

  return {
    notification: {
      householdId: shared.household_id,
      authorId: tx.user_id,
      title: (name) => `${name} ${action}`,
      body: `${money(Number(tx.amount), shared.currency.trim())} en ${shared.name}${detail ? ` · ${detail}` : ''}`,
      data: { kind: 'partner-transaction', transactionId: tx.id },
    },
  };
}

async function contributionNotification(supabase: SupabaseClient, id: string): Promise<Outcome> {
  const { data: contribution, error } = await supabase
    .from('goal_contributions')
    .select('id, user_id, amount, note, goal:goals (id, name, household_id)')
    .eq('id', id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!contribution) return { skip: 'contribution_not_found' };

  const goal = contribution.goal as unknown as {
    id: string;
    name: string;
    household_id: string | null;
  } | null;
  if (!goal?.household_id) return { skip: 'not_shared' };

  const amount = Number(contribution.amount);
  const withdrawal = amount < 0;

  return {
    notification: {
      householdId: goal.household_id,
      authorId: contribution.user_id,
      // The goal name goes in the body: Android truncates long titles when collapsed.
      title: (name) => `${name} ${withdrawal ? 'retiró de una meta' : 'aportó a una meta'}`,
      // Goals have no currency of their own; the app works in MXN.
      body: `${money(Math.abs(amount), 'MXN')} en ${goal.name}${contribution.note ? ` · ${contribution.note}` : ''}`,
      data: { kind: 'partner-goal', goalId: goal.id },
    },
  };
}

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

  const payload = await req.json().catch(() => ({}));
  const { transaction_id: transactionId, contribution_id: contributionId } = payload ?? {};

  let outcome: Outcome;
  if (typeof transactionId === 'string') {
    outcome = await transactionNotification(supabase, transactionId);
  } else if (typeof contributionId === 'string') {
    outcome = await contributionNotification(supabase, contributionId);
  } else {
    return json({ error: 'missing_id' }, 400);
  }
  if ('error' in outcome) return json({ error: outcome.error }, 500);
  if ('skip' in outcome) return json({ sent: 0, reason: outcome.skip });
  const { notification } = outcome;

  const { data: members } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', notification.householdId)
    .neq('user_id', notification.authorId);
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (!memberIds.length) return json({ sent: 0, reason: 'no_partner' });

  const [{ data: profiles }, { data: author }] = await Promise.all([
    supabase.from('profiles').select('id, notify_partner_activity').in('id', memberIds),
    supabase.from('profiles').select('display_name').eq('id', notification.authorId).maybeSingle(),
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

  const title = notification.title(author?.display_name ?? 'Tu pareja');
  const messages = tokens.map(({ token }) => ({
    to: token,
    title,
    body: notification.body,
    sound: 'default',
    channelId: CHANNEL_ID,
    data: notification.data,
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

  const errors = result.data.filter((t) => t.status === 'error');
  if (errors.length) console.error('Expo push tickets with errors', JSON.stringify(errors));

  // Forget phones that uninstalled the app or revoked notifications.
  const stale = result.data
    .map((ticket, i) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? messages[i].to
        : null,
    )
    .filter((t): t is string => t !== null);
  if (stale.length) await supabase.from('push_tokens').delete().in('token', stale);

  return json({ sent: messages.length - errors.length });
});
