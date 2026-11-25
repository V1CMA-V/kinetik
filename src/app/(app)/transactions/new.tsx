import { router, useLocalSearchParams } from 'expo-router';

import { useAccounts } from '@/features/accounts/api';
import { useCreateTransaction } from '@/features/transactions/api';
import { TransactionForm } from '@/features/transactions/components/transaction-form';
import { TRANSACTION_KIND_ORDER, type TransactionKind } from '@/features/transactions/constants';
import { today } from '@/lib/date';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Also opened from app shortcuts and the home-screen widget via
 * `kinetik://transactions/new?kind=expense|income|transfer`.
 */
export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ kind?: string; accountId?: string }>();
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
  const category = kind === 'transfer' ? undefined : lastCategories[kind];

  return (
    <TransactionForm
      title="Nuevo movimiento"
      defaultValues={{
        kind,
        amount: '',
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
