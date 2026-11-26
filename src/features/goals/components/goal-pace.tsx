import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useIncomeProfile } from '@/features/income/api';
import { useFormatMoney } from '@/hooks/use-format-money';
import { today } from '@/lib/date';

import { PER_PAYDAY, contributionPerPayday, monthsToReach, suggestedMonthlySavings } from '../pace';

type Props = {
  /** Still missing (0 once reached). */
  remaining: number;
  targetDate: string | null;
  /** Couple goal: the hints speak of your own part. */
  shared: boolean;
  /** Also suggest the extras and, without a date, the 20% savings. */
  detailed?: boolean;
};

const months = (n: number) => `${n} ${n === 1 ? 'mes' : 'meses'}`;

/** Pace hints from your income profile; nothing without one. */
export function GoalPace({ remaining, targetDate, shared, detailed = false }: Props) {
  const formatAmount = useFormatMoney();
  const { data: profile } = useIncomeProfile();

  if (!profile || !(remaining > 0)) return null;

  const lines: string[] = [];
  const reach = shared ? 'llegarían' : 'llegarías';

  // Monthly pay on the detail screen: its own "Ahorra $X al mes" line already covers it,
  // and a second, slightly different monthly amount would be confusing.
  const pace =
    detailed && profile.pay_frequency === 'monthly'
      ? null
      : contributionPerPayday(profile, remaining, targetDate, today());
  if (pace) {
    const amount = formatAmount(pace.amount);
    lines.push(
      pace.paydays === 0
        ? `Aporta ${amount} antes de la fecha para llegar a tiempo.`
        : shared
          ? `Si aportas ${amount} ${PER_PAYDAY[profile.pay_frequency]}, llegan a tiempo.`
          : `Aporta ${amount} ${PER_PAYDAY[profile.pay_frequency]} para llegar a tiempo.`,
    );
  } else if (detailed && !targetDate) {
    const savings = suggestedMonthlySavings(profile);
    const n = monthsToReach(remaining, savings);
    if (n) {
      lines.push(
        `Si apartas ${formatAmount(savings)} al mes (el 20% de tu ingreso), ${reach} en ${months(n)}.`,
      );
    }
  }

  if (detailed) {
    const n = monthsToReach(remaining, profile.variable_monthly);
    if (n) lines.push(`Si mandas tus extras aquí, ${reach} en ${months(n)}.`);
  }

  if (!lines.length) return null;

  return (
    <View className="gap-1">
      {lines.map((line) => (
        <Text key={line} className="text-xs text-ink-muted">
          {line}
        </Text>
      ))}
    </View>
  );
}
