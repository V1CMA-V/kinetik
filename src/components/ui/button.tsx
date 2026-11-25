import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={`h-12 flex-row items-center justify-center rounded-xl px-4 active:opacity-80 disabled:opacity-50 ${
        isPrimary ? 'bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-800'
      }`}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : undefined} />
      ) : (
        <Text
          className={`text-base font-semibold ${
            isPrimary ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
          }`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
