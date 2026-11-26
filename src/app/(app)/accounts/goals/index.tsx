import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';

import { Screen } from '@/components/screen';
import { alert } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useDeleteGoal } from '@/features/goals/api';
import { GoalCard } from '@/features/goals/components/goal-card';
import { GoalProgressBar } from '@/features/goals/components/goal-progress-bar';
import { type GoalWithProgress, useGoalsProgress } from '@/features/goals/use-goals-progress';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeColors } from '@/theme/colors';

export default function GoalsScreen() {
  const formatAmount = useFormatMoney();
  const colors = useThemeColors();
  const myId = useAuthStore((s) => s.session?.user.id);
  const goals = useGoalsProgress();
  const remove = useDeleteGoal();

  const { sections, saved, target } = useMemo(() => {
    const active = goals.items.filter((g) => !g.progress.reached);
    const shared = active.filter((g) => g.goal.household_id);
    const personal = active.filter((g) => !g.goal.household_id);
    const reached = goals.items.filter((g) => g.progress.reached);
    return {
      sections: [
        { title: 'En pareja', data: shared },
        { title: 'Personales', data: personal },
        { title: 'Cumplidas', data: reached },
      ].filter((s) => s.data.length),
      saved: active.reduce((sum, g) => sum + Math.max(0, g.progress.saved), 0),
      target: active.reduce((sum, g) => sum + g.goal.target_amount, 0),
    };
  }, [goals.items]);

  const confirmDelete = ({ goal }: GoalWithProgress) => {
    alert('Eliminar meta', `Se borrarán "${goal.name}" y todas sus aportaciones.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(goal.id) },
    ]);
  };

  const ratio = target > 0 ? saved / target : 0;

  return (
    <Screen className="pt-4">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.goal.id}
        contentContainerClassName="pb-8"
        stickySectionHeadersEnabled={false}
        refreshing={goals.isRefetching}
        onRefresh={goals.refetch}
        ListHeaderComponent={
          <View className="mb-2 gap-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver a cuentas"
                  hitSlop={4}
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
                  style={{ borderRadius: 22 }}
                >
                  <Icon ios="chevron.left" android="chevron_left" color={colors.ink} />
                </Pressable>
                <Text className="font-display text-3xl font-bold text-ink">Metas</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar meta"
                hitSlop={4}
                onPress={() => router.push('/accounts/goals/new')}
                className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
                style={{ borderRadius: 22 }}
              >
                <Icon ios="plus" android="add" color={colors['on-accent']} size={24} />
              </Pressable>
            </View>

            {target > 0 ? (
              <View className="gap-4 rounded-card border border-line bg-card p-5">
                <View className="gap-1">
                  <Text className="text-sm font-medium text-ink-muted">Llevas ahorrado</Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    className="font-display text-3xl font-bold tabular-nums text-ink"
                  >
                    {formatAmount(saved)}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    de{' '}
                    <Text className="text-xs font-semibold tabular-nums text-ink">
                      {formatAmount(target)}
                    </Text>{' '}
                    en tus metas activas
                  </Text>
                </View>
                <GoalProgressBar ratio={ratio} reached={false} height="h-3" />
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="mb-2 mt-5 flex-row items-baseline justify-between px-1">
            <Text className="text-lg font-bold text-ink">{section.title}</Text>
            <Text className="text-sm font-semibold text-ink-muted">{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <GoalCard
            goal={item.goal}
            progress={item.progress}
            index={index}
            count={section.data.length}
            onPress={() =>
              router.push({ pathname: '/accounts/goals/[id]', params: { id: item.goal.id } })
            }
            onLongPress={item.goal.user_id === myId ? () => confirmDelete(item) : undefined}
          />
        )}
        ListEmptyComponent={
          goals.isPending ? (
            <ActivityIndicator className="mt-8" />
          ) : goals.isError ? (
            <Text className="mt-8 text-center text-expense">{goals.error.message}</Text>
          ) : (
            <View className="mt-6 items-center gap-3 rounded-card border border-line bg-card p-6">
              <View
                className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft"
                style={{ borderRadius: 24 }}
              >
                <Icon ios="flag" android="flag" color={colors['accent-ink']} />
              </View>
              <Text className="text-center text-base font-semibold text-ink">Sin metas</Text>
              <Text className="text-center text-sm text-ink-muted">
                Junta para un viaje, el enganche o un fondo de emergencia, solo o en pareja, y ve
                cuánto les falta.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          goals.items.length ? (
            <Text className="mt-5 text-center text-xs text-ink-muted">
              Toca una meta para aportar · mantén presionada para eliminarla
            </Text>
          ) : undefined
        }
      />
    </Screen>
  );
}
