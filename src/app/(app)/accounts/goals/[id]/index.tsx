import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { alert } from '@/components/ui/dialog';
import { groupedRowClass } from '@/components/ui/grouped';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { type GoalContribution, useDeleteContribution, useGoal } from '@/features/goals/api';
import { GoalProgressBar } from '@/features/goals/components/goal-progress-bar';
import { formatTargetMonth } from '@/features/goals/format';
import { computeGoalProgress } from '@/features/goals/progress';
import { useMemberName } from '@/features/goals/use-goals-progress';
import { SharedBadge } from '@/features/household/components/shared-badge';
import { useFormatMoney } from '@/hooks/use-format-money';
import { formatDay, today } from '@/lib/date';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeColors } from '@/theme/colors';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const myId = useAuthStore((s) => s.session?.user.id);
  const memberName = useMemberName();
  const goal = useGoal(id);
  const remove = useDeleteContribution();

  const progress = useMemo(
    () => (goal.data ? computeGoalProgress(goal.data, goal.data.contributions, today()) : null),
    [goal.data],
  );

  if (goal.isPending) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!goal.data || !progress) {
    return (
      <Screen className="justify-center gap-4">
        <Text className="text-center text-base text-ink-muted">
          {goal.error?.message ?? 'Esta meta ya no existe.'}
        </Text>
        <Button title="Volver" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const current = goal.data;
  const p = progress;
  const isShared = !!current.household_id;

  const confirmDelete = (c: GoalContribution) => {
    alert(
      c.amount > 0 ? 'Eliminar aportación' : 'Eliminar retiro',
      `${formatAmount(Math.abs(c.amount))} del ${formatDay(c.contributed_on).toLowerCase()}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => remove.mutate({ id: c.id, goalId: current.id }),
        },
      ],
    );
  };

  const statusLine = p.reached
    ? `¡Meta cumplida! Juntaron ${formatAmount(p.saved)}.`
    : p.overdue
      ? `La fecha era ${formatTargetMonth(current.target_date!)}. Faltan ${formatAmount(p.remaining)}.`
      : p.monthlyNeeded !== null
        ? `Ahorra ${formatAmount(p.monthlyNeeded)} al mes para llegar en ${formatTargetMonth(current.target_date!)}.`
        : `Faltan ${formatAmount(p.remaining)}.`;

  return (
    <Screen className="pt-4">
      <FlatList
        data={current.contributions}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-8"
        refreshing={goal.isRefetching}
        onRefresh={goal.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center gap-3">
              <RoundButton label="Volver a metas" onPress={() => router.back()}>
                <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
              </RoundButton>
              <View className="flex-1 flex-row items-center gap-2">
                <Text numberOfLines={1} className="flex-shrink text-lg font-bold text-ink">
                  {current.name}
                </Text>
                {isShared ? <SharedBadge owner={null} /> : null}
              </View>
              <RoundButton
                label="Editar meta"
                onPress={() =>
                  router.push({ pathname: '/accounts/goals/[id]/edit', params: { id: current.id } })
                }
              >
                <Icon ios="pencil" android="edit" color={colors.ink} size={20} />
              </RoundButton>
            </View>

            <View className="gap-4 rounded-card border border-line bg-card p-5">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-medium text-ink-muted">Llevan ahorrado</Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className="font-display text-4xl font-bold tabular-nums text-ink"
                  >
                    {formatAmount(p.saved)}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    de{' '}
                    <Text className="text-xs font-semibold tabular-nums text-ink">
                      {formatAmount(current.target_amount)}
                    </Text>
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${p.reached ? 'bg-income/15' : 'bg-accent-soft'}`}
                >
                  <Text
                    className={`text-xs font-semibold tabular-nums ${
                      p.reached ? 'text-income' : 'text-accent-ink'
                    }`}
                  >
                    {Math.round(p.ratio * 100)}%
                  </Text>
                </View>
              </View>

              <GoalProgressBar ratio={p.ratio} reached={p.reached} height="h-3" />

              <Text
                className={`text-sm ${
                  p.reached
                    ? 'font-semibold text-income'
                    : p.overdue
                      ? 'text-expense'
                      : 'text-ink-muted'
                }`}
              >
                {statusLine}
              </Text>

              {isShared && p.byUser.length ? (
                <View className="gap-2 border-t border-line pt-4">
                  {p.byUser.map((m) => (
                    <View key={m.userId} className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-sm text-ink-muted">{memberName(m.userId)}</Text>
                      <Text className="text-sm font-semibold tabular-nums text-ink">
                        {formatAmount(m.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <Button
              title={p.reached ? 'Registrar otro movimiento' : 'Aportar'}
              onPress={() =>
                router.push({
                  pathname: '/accounts/goals/[id]/contribute',
                  params: { id: current.id },
                })
              }
            />

            {current.contributions.length ? (
              <View className="-mb-3 mt-2 flex-row items-baseline justify-between px-1">
                <Text className="text-lg font-bold text-ink">Historial</Text>
                <Text className="text-sm font-semibold text-ink-muted">
                  {current.contributions.length}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const mine = item.user_id === myId;
          const deposit = item.amount > 0;
          return (
            <Pressable
              accessibilityRole={mine ? 'button' : undefined}
              accessibilityHint={mine ? 'Mantén presionado para eliminar' : undefined}
              disabled={!mine}
              onLongPress={() => confirmDelete(item)}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-80 ${groupedRowClass(
                index,
                current.contributions.length,
              )}`}
            >
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  deposit ? 'bg-income/15' : 'bg-expense-soft'
                }`}
                style={{ borderRadius: 18 }}
              >
                <Icon
                  ios={deposit ? 'arrow.down' : 'arrow.up'}
                  android={deposit ? 'south' : 'north'}
                  color={deposit ? colors.income : colors.expense}
                  size={16}
                />
              </View>
              <View className="flex-1 gap-0.5">
                <Text numberOfLines={1} className="text-base font-semibold text-ink">
                  {item.note || (deposit ? 'Aportación' : 'Retiro')}
                </Text>
                <Text numberOfLines={1} className="text-xs text-ink-muted">
                  {formatDay(item.contributed_on)}
                  {isShared ? ` · ${memberName(item.user_id)}` : ''}
                </Text>
              </View>
              <Text
                className={`text-base font-bold tabular-nums ${deposit ? 'text-income' : 'text-expense'}`}
              >
                {deposit ? '+' : '-'}
                {formatAmount(Math.abs(item.amount))}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-4 text-center text-sm text-ink-muted">
            Aún no hay aportaciones. Registra la primera con Aportar.
          </Text>
        }
        ListFooterComponent={
          current.contributions.some((c) => c.user_id === myId) ? (
            <Text className="mt-5 text-center text-xs text-ink-muted">
              Mantén presionada una aportación tuya para eliminarla.
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
      style={{ borderRadius: 22 }}
    >
      {children}
    </Pressable>
  );
}
