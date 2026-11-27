import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { StatementStatus } from '@/features/accounts/credit-card';
import type { PaymentMonth } from '@/features/accounts/payments-by-month';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatMonth, formatShortDate } from '@/lib/date';

function statusLabel(status: StatementStatus, cutDate: string, dueDate: string) {
  const due = `pagas antes del ${formatShortDate(dueDate)}`;
  if (status === 'closed') return `Corte del ${formatShortDate(cutDate)}, ${due}`;
  if (status === 'open') return `En curso, cierra el ${formatShortDate(cutDate)}, ${due}`;
  return `Meses sin intereses, ${due}`;
}

/** Card statements grouped by the month they're due, so purchases after a cut show up in the month you'll pay them. */
export function CardPaymentsByMonth({ months }: { months: PaymentMonth[] }) {
  const formatAmount = useFormatMoney();

  return (
    <View className="gap-3">
      {months.map((m) => (
        <View key={m.month} className="gap-3 rounded-card border border-line bg-card p-4">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-base font-semibold text-ink">
              Pagas en {formatMonth(m.month).split(' ')[0].toLowerCase()}
            </Text>
            <Text className="font-display text-xl font-bold tabular-nums text-ink">
              {formatAmount(m.total)}
            </Text>
          </View>
          <View className="gap-2.5 border-t border-line pt-3">
            {m.payments.map((p) => (
              <Pressable
                key={`${p.accountId}-${p.cutDate}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/accounts/[id]', params: { id: p.accountId } })
                }
                className="flex-row items-center gap-3 active:opacity-70"
              >
                <View className="flex-1 gap-0.5">
                  <Text numberOfLines={1} className="text-sm font-semibold text-ink">
                    {p.name}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-ink-muted">
                    {statusLabel(p.status, p.cutDate, p.dueDate)}
                  </Text>
                </View>
                <Text className="text-sm font-semibold tabular-nums text-ink">
                  {formatAmount(p.amount)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text className="text-xs text-ink-muted">
        Lo que compras después del corte se paga hasta el siguiente mes. Los cortes en curso siguen
        sumando hasta que cierran.
      </Text>
    </View>
  );
}
