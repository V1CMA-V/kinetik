import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { finalizeAmountInput, formatAmountInput } from '@/lib/format';
import { useThemeColors } from '@/theme/colors';

type MoneyInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  label?: string;
  error?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  /** Lets the amount start with `-` (e.g. an overdrawn balance). */
  allowNegative?: boolean;
};

/**
 * Amount field in MXN: shows `$` and `MXN` around the number and formats it as
 * `1,234.56` while typing. The value it emits keeps the thousands commas; the
 * form schemas strip them before parsing.
 */
export function MoneyInput({
  label,
  error,
  value = '',
  onChangeText,
  onBlur,
  allowNegative = false,
  ...props
}: MoneyInputProps) {
  const colors = useThemeColors();
  const options = { allowNegative };

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-muted">{label}</Text> : null}
      <View
        className={`h-12 flex-row items-center rounded-field border bg-sunken px-4 ${
          error ? 'border-expense' : 'border-outline'
        }`}
      >
        <Text className="text-base text-ink-muted">$</Text>
        <TextInput
          placeholder="0.00"
          placeholderTextColor={colors['ink-muted']}
          keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
          className="h-full flex-1 px-2 font-sans text-base text-ink"
          accessibilityLabel={label}
          {...props}
          value={formatAmountInput(value, options)}
          onChangeText={(text) => onChangeText?.(formatAmountInput(text, options))}
          onBlur={(event) => {
            const finalized = finalizeAmountInput(value, options);
            if (finalized !== value) onChangeText?.(finalized);
            onBlur?.(event);
          }}
        />
        <Text className="text-sm font-medium text-ink-muted">MXN</Text>
      </View>
      {error ? <Text className="text-sm text-expense">{error}</Text> : null}
    </View>
  );
}
