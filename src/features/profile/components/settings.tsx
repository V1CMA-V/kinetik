import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

export type RowIcon = { ios: SFSymbol; android: AndroidSymbol };

function Chevron() {
  const colors = useThemeColors();
  return <Icon ios="chevron.right" android="chevron_right" color={colors['ink-muted']} size={18} />;
}

/** Titled group of settings rows (iOS-style inset card). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-semibold text-ink-muted">{title}</Text>
      <View className="overflow-hidden rounded-card border border-line bg-card">{children}</View>
    </View>
  );
}

type RowProps = {
  label: string;
  description?: string;
  /** Leading icon. */
  icon?: RowIcon;
  /** Text shown on the right (e.g. current value). */
  value?: string;
  /** Pressable row with a chevron. */
  onPress?: () => void;
  /** Custom element on the right (overrides value/chevron). */
  right?: ReactNode;
  destructive?: boolean;
  /** Shown but not available yet: muted, not pressable. */
  disabled?: boolean;
  /** Hide the bottom divider (last row of a section). */
  last?: boolean;
};

export function SettingsRow({
  label,
  description,
  icon,
  value,
  onPress,
  right,
  destructive,
  disabled,
  last,
}: RowProps) {
  const colors = useThemeColors();
  const pressable = onPress && !disabled;

  const content = (
    <View
      accessibilityState={disabled ? { disabled: true } : undefined}
      className={`min-h-14 flex-row items-center gap-3 px-4 py-3 ${
        last ? '' : 'border-b border-line'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {icon ? (
        <Icon ios={icon.ios} android={icon.android} color={colors['ink-muted']} size={20} />
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text className={`text-base ${destructive ? 'text-expense' : 'text-ink'}`}>{label}</Text>
        {description ? <Text className="text-xs text-ink-muted">{description}</Text> : null}
      </View>
      {right ??
        (value || pressable ? (
          <View className="flex-row items-center gap-1">
            {value ? (
              <Text numberOfLines={1} className="max-w-48 text-sm text-ink-muted">
                {value}
              </Text>
            ) : null}
            {pressable ? <Chevron /> : null}
          </View>
        ) : null)}
    </View>
  );

  if (!pressable) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  );
}

type SwitchRowProps = {
  label: string;
  description?: string;
  icon?: RowIcon;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
};

export function SwitchRow({ value, onValueChange, disabled, ...props }: SwitchRowProps) {
  const colors = useThemeColors();
  return (
    <SettingsRow
      {...props}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.outline, true: colors.accent }}
          thumbColor={colors.card}
        />
      }
    />
  );
}

/** Pill on the right of a row for options that aren't available yet. */
export function ComingSoonPill() {
  return (
    <View className="rounded-full bg-sunken px-2.5 py-1">
      <Text className="text-xs font-medium text-ink-muted">Próximamente</Text>
    </View>
  );
}
