import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useFormatMoney } from '@/hooks/use-format-money';

import type { MonthProjection } from '../projection';
import { Legend } from './cashflow-chart';

type Props = {
  projection: MonthProjection;
  previousName: string;
};

const CHART_HEIGHT = 96;
const DOT = 4;

/**
 * Cumulative spending per day: solid up to today, faded for the projection, and
 * dots with the previous month at the same day.
 */
export function MonthProjectionCard({ projection: p, previousName }: Props) {
  const formatAmount = useFormatMoney();
  const max = Math.max(1, ...p.cumulative, ...(p.previousCumulative ?? []));
  const y = (value: number) => (value / max) * CHART_HEIGHT;

  const vsPrevious = p.previousToDate !== null ? p.spentToDate - p.previousToDate : null;

  return (
    <View className="gap-4 rounded-card border border-line bg-card p-4">
      <View className="flex-row justify-between gap-3">
        <Figure label="Llevas" value={formatAmount(p.spentToDate)} />
        <Figure label="Por día" value={formatAmount(p.dailyAverage)} align="center" />
        <Figure label="Al cierre" value={`≈ ${formatAmount(p.projected)}`} align="end" strong />
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-end" style={{ height: CHART_HEIGHT, gap: 2 }}>
          {p.cumulative.map((value, i) => {
            const isPast = i < p.day;
            const previous = p.previousCumulative?.[i];
            return (
              <View key={i} className="flex-1 justify-end" style={{ height: CHART_HEIGHT }}>
                <View
                  className={isPast ? 'bg-accent' : 'bg-accent/25'}
                  style={{
                    height: Math.max(2, y(value)),
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                  }}
                />
                {previous !== undefined ? (
                  <View
                    className="absolute self-center rounded-full bg-ink"
                    style={{
                      width: DOT,
                      height: DOT,
                      borderRadius: DOT / 2,
                      bottom: y(previous) - DOT / 2,
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
        <View className="flex-row justify-between">
          <Text className="text-xs text-ink-muted">1</Text>
          <Text className="text-xs font-semibold text-ink">Hoy es día {p.day}</Text>
          <Text className="text-xs text-ink-muted">{p.daysInMonth}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
        <Legend className="bg-accent" label="Real" />
        <Legend className="bg-accent/25" label="Proyectado" />
        {p.previousCumulative ? <Legend className="bg-ink" label={`En ${previousName}`} /> : null}
      </View>

      {vsPrevious !== null && vsPrevious !== 0 ? (
        <Text className="text-sm leading-5 text-ink-muted">
          Al día {p.day} de {previousName} llevabas {formatAmount(p.previousToDate ?? 0)}. Vas{' '}
          <Text
            className={`text-sm font-semibold tabular-nums ${
              vsPrevious > 0 ? 'text-expense' : 'text-income'
            }`}
          >
            {formatAmount(Math.abs(vsPrevious))} {vsPrevious > 0 ? 'arriba' : 'abajo'}
          </Text>
          .
        </Text>
      ) : null}
      {p.scheduled > 0 ? (
        <Text className="text-xs text-ink-muted">
          Incluye {formatAmount(p.scheduled)} ya programados para lo que resta del mes.
        </Text>
      ) : null}
    </View>
  );
}

function Figure({
  label,
  value,
  align = 'start',
  strong,
}: {
  label: string;
  value: string;
  align?: 'start' | 'center' | 'end';
  strong?: boolean;
}) {
  const alignClass = align === 'end' ? 'items-end' : align === 'center' ? 'items-center' : '';
  return (
    <View className={`flex-1 gap-0.5 ${alignClass}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        className={`tabular-nums ${
          strong
            ? 'font-display text-lg font-bold text-accent-ink'
            : 'text-base font-semibold text-ink'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
