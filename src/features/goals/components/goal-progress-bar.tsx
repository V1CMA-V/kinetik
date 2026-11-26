import { View } from 'react-native';

/** Goal progress, green once reached. */
export function GoalProgressBar({
  ratio,
  reached,
  height = 'h-2',
}: {
  ratio: number;
  reached: boolean;
  height?: 'h-2' | 'h-3';
}) {
  const percent = Math.min(100, Math.round(ratio * 100));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className={`${height} overflow-hidden rounded-full bg-sunken`}
    >
      <View
        className={`h-full rounded-full ${reached ? 'bg-income' : 'bg-accent'}`}
        style={{ width: `${percent}%` }}
      />
    </View>
  );
}
