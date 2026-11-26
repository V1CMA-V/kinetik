import { router } from 'expo-router';
import { View } from 'react-native';

import { GoalCard } from '@/features/goals/components/goal-card';
import { useGoalsProgress } from '@/features/goals/use-goals-progress';

import { HomeSection } from './home-section';

const MAX_GOALS = 3;

/** Active goals closest to done; hidden when there are none. */
export function MyGoals() {
  const goals = useGoalsProgress();
  const active = goals.items.filter((g) => !g.progress.reached).slice(0, MAX_GOALS);
  if (!active.length) return null;

  return (
    <HomeSection
      title="Metas"
      action={{ label: 'Ver todas', onPress: () => router.push('/accounts/goals') }}
    >
      <View>
        {active.map(({ goal, progress }, i) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            progress={progress}
            index={i}
            count={active.length}
            onPress={() =>
              router.push({ pathname: '/accounts/goals/[id]', params: { id: goal.id } })
            }
          />
        ))}
      </View>
    </HomeSection>
  );
}
