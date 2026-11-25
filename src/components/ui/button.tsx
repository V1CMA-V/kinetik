import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
};

const CONTAINER_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent',
  secondary: 'bg-sunken',
  destructive: 'bg-expense-soft',
};

const TEXT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'text-on-accent',
  secondary: 'text-ink',
  destructive: 'text-expense',
};

export function Button({ title, variant = 'primary', loading, disabled, ...props }: ButtonProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`h-12 flex-row items-center justify-center rounded-full px-5 active:opacity-80 disabled:opacity-50 ${CONTAINER_CLASSES[variant]}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors['on-accent'] : colors.ink} />
      ) : (
        <Text className={`text-base font-semibold ${TEXT_CLASSES[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
