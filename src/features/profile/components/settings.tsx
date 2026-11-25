import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

/** Titled group of settings rows (iOS-style inset card). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-medium text-neutral-500">{title}</Text>
      <View className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {children}
      </View>
    </View>
  );
}

type RowProps = {
  label: string;
  description?: string;
  /** Text shown on the right (e.g. current value). */
  value?: string;
  /** Pressable row with a chevron. */
  onPress?: () => void;
  /** Custom element on the right (overrides value/chevron). */
  right?: ReactNode;
  destructive?: boolean;
  /** Hide the bottom divider (last row of a section). */
  last?: boolean;
};

export function SettingsRow({
  label,
  description,
  value,
  onPress,
  right,
  destructive,
  last,
}: RowProps) {
  const content = (
    <View
      className={`min-h-14 flex-row items-center gap-3 px-4 py-3 ${
        last ? '' : 'border-b border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <View className="flex-1 gap-0.5">
        <Text
          className={`text-base ${
            destructive ? 'text-red-500' : 'text-neutral-900 dark:text-white'
          }`}
        >
          {label}
        </Text>
        {description ? <Text className="text-xs text-neutral-500">{description}</Text> : null}
      </View>
      {right ??
        (value || onPress ? (
          <View className="flex-row items-center gap-1">
            {value ? (
              <Text numberOfLines={1} className="max-w-48 text-sm text-neutral-500">
                {value}
              </Text>
            ) : null}
            {onPress ? <Text className="text-xl text-neutral-400">›</Text> : null}
          </View>
        ) : null)}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  );
}

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
};

export function SwitchRow({ value, onValueChange, disabled, ...props }: SwitchRowProps) {
  return (
    <SettingsRow
      {...props}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: '#208AEF' }}
        />
      }
    />
  );
}
