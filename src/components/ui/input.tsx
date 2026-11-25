import { Text, TextInput, View, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        className={`h-12 rounded-xl border bg-white px-4 text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 ${
          error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
        }`}
        {...props}
      />
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
