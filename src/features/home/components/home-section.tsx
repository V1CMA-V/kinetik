import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

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
        <Text className="text-lg font-bold text-ink">{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={action.onPress}>
            <Text className="text-sm font-semibold text-accent-ink">{action.label}</Text>
          </Pressable>
        ) : aside ? (
          <Text className="text-sm font-semibold text-ink-muted">{aside}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Rounded card used by every Home section. */
export function HomeCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-card border border-line bg-card p-4 ${className}`}>{children}</View>
  );
}
