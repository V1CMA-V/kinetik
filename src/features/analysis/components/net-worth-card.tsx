import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { DEFAULT_CURRENCY } from '@/features/accounts/constants';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatMonth, today } from '@/lib/date';

import type { NetWorthMonth } from '../use-net-worth-history';
import { Legend } from './cashflow-chart';

type Props = {
  months: NetWorthMonth[];
  selected: string;
  onSelect: (month: string) => void;
};

const CHART_HEIGHT = 120;
const MIN_HEIGHT = 4;

/** "noviembre de 2026" → "Nov". */
const shortMonth = (iso: string) => formatMonth(iso).slice(0, 3);

/** Net worth at the end of each month, with the change vs. the previous month. */
export function NetWorthCard({ months, selected, onSelect }: Props) {
  const formatAmount = useFormatMoney();
  const money = (n: number) => formatAmount(n, DEFAULT_CURRENCY);

  const index = months.findIndex((m) => m.month === selected);
  const current = months[index]?.point ?? null;
  const previous = index > 0 ? months[index - 1].point : null;
  const delta = current && previous ? current.net - previous.net : null;
  const previousName = index > 0 ? formatMonth(months[index - 1].month).split(' ')[0] : '';

  const values = months.flatMap((m) => (m.point ? [m.point.net] : []));
  const maxUp = Math.max(0, ...values);
  const maxDown = Math.max(0, ...values.map((v) => -v));
  const scale = maxUp + maxDown;
  // Height split above / below zero, proportional to the largest value on each side.
  const upHeight = scale ? (maxUp / scale) * CHART_HEIGHT : CHART_HEIGHT;
  const downHeight = CHART_HEIGHT - upHeight;
  const barHeight = (value: number) =>
    scale ? Math.max(MIN_HEIGHT, (Math.abs(value) / scale) * CHART_HEIGHT) : MIN_HEIGHT;

  return (
    <View className="gap-5 rounded-card border border-line bg-card p-4">
      <View className="gap-0.5">
        <Text className="text-sm font-medium text-ink-muted">
          {!current
            ? 'Patrimonio'
            : current.date === today()
              ? 'Hoy'
              : `Al cierre de ${formatMonth(selected).split(' ')[0].toLowerCase()}`}
        </Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          className={`font-display text-3xl font-bold tabular-nums ${
            current && current.net < 0 ? 'text-expense' : 'text-ink'
          }`}
        >
          {current ? money(current.net) : '—'}
        </Text>
        {delta !== null ? (
          <Text
            className={`text-sm font-medium ${
              delta > 0 ? 'text-income' : delta < 0 ? 'text-expense' : 'text-ink-muted'
            }`}
          >
            {delta === 0
              ? `Igual que en ${previousName.toLowerCase()}`
              : `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))} vs. ${previousName.toLowerCase()}`}
          </Text>
        ) : !current ? (
          <Text className="text-sm text-ink-muted">Aún no hay datos para este mes.</Text>
        ) : null}
      </View>

      {current ? (
        <View className="flex-row justify-between gap-3">
          <Figure label="Tengo" value={money(current.available)} />
          <Figure label="Debo en tarjetas" value={money(current.debt)} align="end" />
        </View>
      ) : null}

      <View className="gap-3">
        <View className="flex-row justify-between gap-2">
          {months.map(({ month, point }) => {
            const isSelected = month === selected;
            const net = point?.net ?? 0;
            return (
              <Pressable
                key={month}
                accessibilityRole="button"
                accessibilityLabel={
                  point
                    ? `${formatMonth(month)}: ${money(net)}`
                    : `${formatMonth(month)}: sin datos`
                }
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(month)}
                className="flex-1 items-center gap-2 active:opacity-70"
              >
                <View className="w-full" style={{ opacity: isSelected ? 1 : 0.35 }}>
                  <View className="justify-end" style={{ height: upHeight }}>
                    {point && net > 0 ? (
                      <View
                        className="w-full bg-income"
                        style={{ height: barHeight(net), borderRadius: 999 }}
                      />
                    ) : null}
                  </View>
                  {/* Zero line, plus an empty slot for months without data. */}
                  <View className="h-px w-full bg-line" />
                  <View style={{ height: downHeight }}>
                    {point && net < 0 ? (
                      <View
                        className="w-full bg-expense"
                        style={{ height: barHeight(net), borderRadius: 999 }}
                      />
                    ) : null}
                  </View>
                </View>
                <Text className={`text-xs ${isSelected ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {shortMonth(month)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {maxDown > 0 ? (
          <View className="flex-row justify-center gap-4">
            <Legend className="bg-income" label="A favor" />
            <Legend className="bg-expense" label="En contra" />
          </View>
        ) : null}
      </View>

      <Text className="text-xs text-ink-muted">
        Calculado con tus saldos de hoy y los movimientos registrados; no incluye cuentas
        archivadas.
      </Text>
    </View>
  );
}

function Figure({
  label,
  value,
  align = 'start',
}: {
  label: string;
  value: string;
  align?: 'start' | 'end';
}) {
  return (
    <View className={`gap-0.5 ${align === 'end' ? 'items-end' : ''}`}>
      <Text className="text-xs text-ink-muted">{label}</Text>
      <Text className="text-base font-semibold tabular-nums text-ink">{value}</Text>
    </View>
  );
}
