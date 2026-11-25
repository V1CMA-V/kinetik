import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, ...props }: InputProps) {
  const colors = useThemeColors();
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-muted">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors['ink-muted']}
        className={`h-12 rounded-field border bg-sunken px-4 font-sans text-base text-ink ${
          error ? 'border-expense' : 'border-outline'
        }`}
        {...props}
      />
      {error ? <Text className="text-sm text-expense">{error}</Text> : null}
    </View>
  );
}
