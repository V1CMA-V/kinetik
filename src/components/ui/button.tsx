import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
};

const CONTAINER_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-500',
  secondary: 'bg-neutral-200 dark:bg-neutral-800',
  destructive: 'bg-red-50 dark:bg-red-950/40',
};

const TEXT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900 dark:text-neutral-100',
  destructive: 'text-red-600 dark:text-red-400',
};

export function Button({ title, variant = 'primary', loading, disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`h-12 flex-row items-center justify-center rounded-xl px-4 active:opacity-80 disabled:opacity-50 ${CONTAINER_CLASSES[variant]}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : undefined} />
      ) : (
        <Text className={`text-base font-semibold ${TEXT_CLASSES[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
