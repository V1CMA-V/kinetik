import { router, useLocalSearchParams } from 'expo-router';

import { useAccounts } from '@/features/accounts/api';
import { useCreateTransaction } from '@/features/transactions/api';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_KIND_ORDER,
  type TransactionKind,
} from '@/features/transactions/constants';
import { today } from '@/lib/date';
import { finalizeAmountInput } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings-store';

const AMOUNT_PARAM = /^\d{1,12}(\.\d{1,2})?$/;

/** `amount` param (plain decimal, e.g. `8500.00`) as form input, or '' if invalid. */
function parseAmountParam(value: unknown) {
  if (typeof value !== 'string' || !AMOUNT_PARAM.test(value) || Number(value) <= 0) return '';
  return finalizeAmountInput(value);
}

function parseCategoryParam(kind: TransactionKind, value: unknown) {
  if (typeof value !== 'string' || kind === 'transfer') return undefined;
  const list: readonly string[] = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.includes(value) ? value : undefined;
}

/**
 * Also opened from app shortcuts and the home-screen widget via
 * `kinetik://transactions/new?kind=expense|income|transfer`, and from the payday
 * reminder with `amount`, `category` and `accountId` to prefill (all optional).
 */
export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    accountId?: string;
    amount?: string;
    category?: string;
  }>();
  const kind: TransactionKind = TRANSACTION_KIND_ORDER.includes(params.kind as TransactionKind)
    ? (params.kind as TransactionKind)
    : 'expense';

  const accounts = useAccounts();
  const createTransaction = useCreateTransaction();
  const lastAccountId = useSettingsStore((s) => s.lastAccountId);
  const lastCategories = useSettingsStore((s) => s.lastCategories);
  const rememberTransaction = useSettingsStore((s) => s.rememberTransaction);

  // Preselect the account passed in (e.g. from its detail screen), else the last used one if
  // it's still active (the form falls back to the first one).
  const isActive = (id: string | null | undefined): id is string =>
    !!id && !!accounts.data?.some((a) => a.id === id);
  const accountId = isActive(params.accountId)
    ? params.accountId
    : isActive(lastAccountId)
      ? lastAccountId
      : '';
  const category =
    parseCategoryParam(kind, params.category) ??
    (kind === 'transfer' ? undefined : lastCategories[kind]);

  return (
    <TransactionForm
      title="Nuevo movimiento"
      defaultValues={{
        kind,
        amount: parseAmountParam(params.amount),
        accountId,
        toAccountId: undefined,
        category,
        description: '',
        occurredOn: today(),
        installmentMonths: null,
      }}
      onSubmit={(values) =>
        createTransaction.mutate(values, {
          onSuccess: () => {
            rememberTransaction({
              kind: values.kind,
              accountId: values.account_id,
              category: values.category,
            });
            // Opened from a shortcut/widget there may be no screen to go back to.
            if (router.canGoBack()) router.back();
            else router.replace('/transactions');
          },
        })
      }
      isSubmitting={createTransaction.isPending}
      error={createTransaction.error?.message}
    />
  );
}
