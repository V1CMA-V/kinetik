/**
 * Personal vs. shared view (pure, no React/Supabase).
 *
 * A movement is classified by its accounts: shared if any side is an account shared
 * with the household, personal if any side is one of your personal accounts. A
 * transfer from a personal account into a shared one shows up in both views. A
 * missing source account is a partner's personal account hidden by RLS (only seen
 * when the money lands in a shared one), so that movement counts as shared.
 */
export type Scope = 'all' | 'personal' | 'shared';

type ScopedAccount = { household_id?: string | null } | null;

export type ScopedMovement = {
  account: ScopedAccount;
  to_account?: ScopedAccount;
};

export function matchesScope(t: ScopedMovement, scope: Scope) {
  if (scope === 'all') return true;
  const sides = [t.account, t.to_account ?? null].filter(
    (a): a is NonNullable<ScopedAccount> => a !== null,
  );
  if (scope === 'shared') return !t.account || sides.some((a) => !!a.household_id);
  return sides.some((a) => !a.household_id);
}

export function filterByScope<T extends ScopedMovement>(rows: T[], scope: Scope) {
  return scope === 'all' ? rows : rows.filter((t) => matchesScope(t, scope));
}
