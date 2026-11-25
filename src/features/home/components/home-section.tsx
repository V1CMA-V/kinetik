import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  /** Shown on the right of the title, e.g. a total. */
  aside?: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
};

export function HomeSection({ title, aside, action, children }: Props) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-lg font-bold text-neutral-900 dark:text-white">{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
            <Text className="text-sm font-semibold text-brand-600 dark:text-brand-100">
              {action.label}
            </Text>
          </Pressable>
        ) : aside ? (
          <Text className="text-sm font-semibold text-neutral-500">{aside}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Rounded card used by every Home section. */
export function HomeCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {children}
    </View>
  );
}
