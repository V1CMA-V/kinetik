import { Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';

type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`rounded-full border px-4 py-2 active:opacity-80 ${
        selected ? 'border-accent bg-accent' : 'border-outline bg-card'
      }`}
      {...props}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-on-accent' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
