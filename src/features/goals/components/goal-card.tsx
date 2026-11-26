import { Pressable, View } from 'react-native';

import { groupedRowClass } from '@/components/ui/grouped';
import { Text } from '@/components/ui/text';
import { SharedBadge } from '@/features/household/components/shared-badge';
import { useFormatMoney } from '@/hooks/use-format-money';

import type { Goal } from '../api';
import { formatTargetMonth } from '../format';
import type { GoalProgress } from '../progress';
import { GoalProgressBar } from './goal-progress-bar';

type Props = {
  goal: Goal;
  progress: GoalProgress;
  /** Position inside its grouped card. */
  index: number;
  count: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function GoalCard({ goal, progress: p, index, count, onPress, onLongPress }: Props) {
  const formatAmount = useFormatMoney();

  const status = p.reached
    ? '¡Meta cumplida!'
    : p.overdue
      ? `La fecha era ${formatTargetMonth(goal.target_date!)}`
      : p.monthlyNeeded !== null
        ? `${formatAmount(p.monthlyNeeded)} al mes hasta ${formatTargetMonth(goal.target_date!)}`
        : `Faltan ${formatAmount(p.remaining)}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      className={`gap-2.5 px-4 py-3.5 active:opacity-80 ${groupedRowClass(index, count)}`}
    >
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="flex-shrink text-base font-semibold text-ink">
          {goal.name}
        </Text>
        {goal.household_id ? <SharedBadge owner={null} /> : null}
        <View className="flex-1" />
        <Text className="text-sm font-semibold tabular-nums text-ink-muted">
          {Math.round(p.ratio * 100)}%
        </Text>
      </View>
      <GoalProgressBar ratio={p.ratio} reached={p.reached} />
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-sm tabular-nums text-ink-muted">
          <Text className="text-sm font-bold text-ink">{formatAmount(p.saved)}</Text> de{' '}
          {formatAmount(goal.target_amount)}
        </Text>
        <Text
          numberOfLines={1}
          className={`flex-shrink text-right text-xs ${
            p.reached
              ? 'font-semibold text-income'
              : p.overdue
                ? 'font-semibold text-expense'
                : 'text-ink-muted'
          }`}
        >
          {status}
        </Text>
      </View>
    </Pressable>
  );
}
