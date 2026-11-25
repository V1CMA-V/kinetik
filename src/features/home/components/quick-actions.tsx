import { router } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

type Action = {
  label: string;
  accessibilityLabel: string;
  ios: SFSymbol;
  android: AndroidSymbol;
  onPress: () => void;
};

const newTransaction = (kind: 'expense' | 'income' | 'transfer') => () =>
  router.push({ pathname: '/transactions/new', params: { kind } });

const ACTIONS: Action[] = [
  {
    label: 'Gasto',
    accessibilityLabel: 'Agregar gasto',
    ios: 'minus',
    android: 'remove',
    onPress: newTransaction('expense'),
  },
  {
    label: 'Ingreso',
    accessibilityLabel: 'Agregar ingreso',
    ios: 'plus',
    android: 'add',
    onPress: newTransaction('income'),
  },
  {
    label: 'Transferir',
    accessibilityLabel: 'Transferir entre cuentas',
    ios: 'arrow.left.arrow.right',
    android: 'swap_horiz',
    onPress: newTransaction('transfer'),
  },
  {
    label: 'Presupuestos',
    accessibilityLabel: 'Ver presupuestos',
    ios: 'chart.pie',
    android: 'pie_chart',
    onPress: () => router.push('/transactions/budgets'),
  },
];

/** Round shortcuts to the most common actions; the first one is the primary. */
export function QuickActions() {
  const colors = useThemeColors();
  return (
    <View className="flex-row justify-between">
      {ACTIONS.map((a, i) => {
        const primary = i === 0;
        return (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel}
            onPress={a.onPress}
            className="w-20 items-center gap-2 active:opacity-70"
          >
            <View
              className={`h-14 w-14 items-center justify-center rounded-full ${
                primary ? 'bg-accent' : 'border border-line bg-card'
              }`}
              style={{ borderRadius: 28 }}
            >
              <Icon
                ios={a.ios}
                android={a.android}
                color={primary ? colors['on-accent'] : colors.ink}
                size={24}
              />
            </View>
            <Text numberOfLines={1} className="text-xs font-medium text-ink">
              {a.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
