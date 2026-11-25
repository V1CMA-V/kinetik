import { Pressable, Text, type PressableProps } from 'react-native';

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
        selected
          ? 'border-brand-500 bg-brand-500'
          : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
      }`}
      {...props}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
