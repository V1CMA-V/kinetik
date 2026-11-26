import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useThemeColors } from '@/theme/colors';

import type { IncomeInsights } from '../income-insights';

type Props = {
  insights: IncomeInsights;
  monthName: string;
  /** Only your personal spending is shown (scope "Personal"). */
  personalOnly: boolean;
};

const percent = (share: number) => Math.round(share * 100);

/** Spending (projected or actual) vs. your declared fixed income for the month. */
export function IncomeInsightsCard({ insights: r, monthName, personalOnly }: Props) {
  const formatAmount = useFormatMoney();
  const isCurrent = r.period === 'current';

  const missing = r.expectedSoFar > 0 && r.incomeGap <= -1;

  return (
    <View className="gap-4 rounded-card border border-line bg-card p-4">
      {r.spendingShare === null ? (
        <Text className="text-sm leading-5 text-ink-muted">
          No esperabas pagos fijos en {monthName}. Revisa tu ingreso en tu perfil.
        </Text>
      ) : (
        <>
          <View className="gap-0.5">
            <Text className="text-base font-semibold leading-6 text-ink">
              {isCurrent ? 'Proyectas gastar el ' : 'Gastaste el '}
              <Text
                className={`font-display text-lg font-bold tabular-nums ${
                  r.spendingShare > 1 ? 'text-expense' : 'text-accent-ink'
                }`}
              >
                {percent(r.spendingShare)}%
              </Text>{' '}
              de tu ingreso
            </Text>
            <Text className="text-xs text-ink-muted">
              {personalOnly ? 'Tus gastos personales' : 'Tus gastos'} vs. tu ingreso fijo de{' '}
              {formatAmount(r.expectedIncome)} ({r.paydays} {r.paydays === 1 ? 'pago' : 'pagos'})
            </Text>
          </View>

          <ShareBar
            spentShare={isCurrent ? (r.spentShare ?? 0) : r.spendingShare}
            totalShare={r.spendingShare}
            label={
              isCurrent
                ? `Llevas el ${percent(r.spentShare ?? 0)}% de tu ingreso; proyectas el ${percent(
                    r.spendingShare,
                  )}%`
                : `Gastaste el ${percent(r.spendingShare)}% de tu ingreso`
            }
          />

          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-sm text-ink-muted">
              {r.savings >= 0
                ? isCurrent
                  ? 'Ahorro estimado'
                  : 'Ahorro vs. lo esperado'
                : isCurrent
                  ? 'Gasto de más estimado'
                  : 'Gasto de más vs. lo esperado'}
            </Text>
            <Text
              className={`text-base font-bold tabular-nums ${
                r.savings >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {formatAmount(Math.abs(r.savings))}
              {r.savingsRate !== null ? ` (${percent(Math.abs(r.savingsRate))}%)` : ''}
            </Text>
          </View>
        </>
      )}

      {missing || r.extras > 0 ? (
        <View className="gap-1.5 border-t border-line pt-3">
          {missing ? (
            <Text className="text-sm leading-5 text-ink-muted">
              Registraste{' '}
              <Text className="text-sm font-semibold tabular-nums text-ink">
                {formatAmount(r.registeredIncome)}
              </Text>{' '}
              de {formatAmount(r.expectedSoFar)} que esperabas{' '}
              {isCurrent ? 'hasta hoy' : `en ${monthName}`}.
            </Text>
          ) : null}
          {r.extras > 0 ? (
            <Text className="text-xs text-ink-muted">
              + {formatAmount(r.extras)} en extras estimados, no contados.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Solid up to what's spent, faded up to the projection; red past 100%. */
function ShareBar({
  spentShare,
  totalShare,
  label,
}: {
  spentShare: number;
  totalShare: number;
  label: string;
}) {
  const clamp = (n: number) => Math.min(100, Math.max(0, n * 100));
  const over = totalShare > 1;
  const spentWidth = clamp(spentShare);
  const projectedWidth = Math.max(0, clamp(totalShare) - spentWidth);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(totalShare)) }}
      className="h-3 flex-row overflow-hidden rounded-full bg-sunken"
    >
      {spentWidth > 0 ? (
        <View
          className={`h-full ${over ? 'bg-expense' : 'bg-accent'}`}
          style={{ width: `${spentWidth}%` }}
        />
      ) : null}
      {projectedWidth > 0 ? (
        <View
          className={`h-full ${over ? 'bg-expense/30' : 'bg-accent/25'}`}
          style={{ width: `${projectedWidth}%` }}
        />
      ) : null}
    </View>
  );
}

/** Shown instead of the card when you haven't declared your income. */
export function IncomePrompt() {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agrega tu ingreso"
      accessibilityHint="Abre tu perfil de ingresos para comparar tus gastos con lo que ganas"
      onPress={() => router.push('/profile/income')}
      className="flex-row items-center gap-3 rounded-card border border-dashed border-line bg-card p-4 active:opacity-70"
    >
      <Icon ios="banknote" android="payments" color={colors['ink-muted']} />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-ink">Agrega tu ingreso</Text>
        <Text className="text-xs leading-4 text-ink-muted">
          Ve qué parte de lo que ganas gastas y cuánto podrías ahorrar.
        </Text>
      </View>
      <Icon ios="chevron.right" android="chevron_right" color={colors['ink-muted']} size={18} />
    </Pressable>
  );
}
