import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

// Small, static pieces of the real UI for the welcome screens. The figures are
// examples, not the user's data (there is no session yet).

/** Net worth with the "tengo / debo" bar, as on Inicio and Cuentas. */
export function NetWorthVignette() {
  return (
    <View className="gap-4 rounded-card bg-card p-5">
      <View className="gap-1">
        <Text className="text-sm font-medium text-ink-muted">Patrimonio neto</Text>
        <Text className="font-display text-3xl font-bold tabular-nums text-ink">$48,215.40</Text>
      </View>
      <View className="h-2 flex-row gap-1">
        <View className="h-full rounded-full bg-accent" style={{ flex: 0.55 }} />
        <View className="h-full rounded-full bg-ink" style={{ flex: 0.35 }} />
        <View className="h-full rounded-full bg-expense" style={{ flex: 0.1 }} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-ink-muted">
          Cuentas y efectivo <Text className="text-xs font-semibold text-ink">$30,180</Text>
        </Text>
        <Text className="text-xs text-ink-muted">
          Deudas <Text className="text-xs font-semibold text-expense">−$5,864</Text>
        </Text>
      </View>
    </View>
  );
}

/** Credit card payment reminder, as on the account detail. */
export function PaymentVignette() {
  const colors = useThemeColors();
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between rounded-card bg-card p-4">
        <View className="gap-0.5">
          <Text className="text-base font-semibold text-ink">Tarjeta de crédito</Text>
          <Text className="text-xs text-ink-muted">Corte día 4, pago día 24</Text>
        </View>
        <Text className="font-display text-xl font-bold tabular-nums text-ink">$2,878.94</Text>
      </View>
      <View className="flex-row items-center gap-3 rounded-card bg-card p-4">
        <Icon ios="clock" android="schedule" color={colors.warning} size={22} />
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-warning">Pagar antes del 2 dic</Text>
          <Text className="text-xs text-ink-muted">
            Faltan 3 días, con 2 compras a meses activas
          </Text>
        </View>
      </View>
    </View>
  );
}

const MONTHS = [
  { label: 'Jun', value: 0.62 },
  { label: 'Jul', value: 0.8 },
  { label: 'Ago', value: 1 },
  { label: 'Sep', value: 0.7 },
  { label: 'Oct', value: 0.86 },
  { label: 'Nov', value: 0.74 },
];

/** Six-month spending columns, as on Análisis. */
export function AnalysisVignette() {
  return (
    <View className="gap-4 rounded-card bg-card p-5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-ink-muted">Gastos del mes</Text>
        <Text className="text-xs font-semibold text-income">8% menos que en octubre</Text>
      </View>
      <View className="h-28 flex-row items-end gap-2">
        {MONTHS.map((m, i) => (
          <View key={m.label} className="h-full flex-1 items-center justify-end gap-1.5">
            <View
              className={`w-full rounded-full ${i === MONTHS.length - 1 ? 'bg-accent' : 'bg-ink'}`}
              style={{ height: `${m.value * 80}%` }}
            />
            <Text
              className={`text-xs ${i === MONTHS.length - 1 ? 'font-semibold text-ink' : 'text-ink-muted'}`}
            >
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
