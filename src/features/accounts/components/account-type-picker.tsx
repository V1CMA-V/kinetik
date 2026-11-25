import { Pressable, Text, View } from 'react-native';

import { ACCOUNT_TYPE_ORDER, ACCOUNT_TYPES, type AccountType } from '../constants';

type Props = {
  value: AccountType;
  onChange: (value: AccountType) => void;
};

export function AccountTypePicker({ value, onChange }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo</Text>
      <View className="flex-row flex-wrap gap-2">
        {ACCOUNT_TYPE_ORDER.map((type) => {
          const selected = type === value;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(type)}
              className={`grow basis-[48%] rounded-xl border px-4 py-3 active:opacity-80 ${
                selected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/30'
                  : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  selected ? 'text-brand-700 dark:text-white' : 'text-neutral-900 dark:text-white'
                }`}
              >
                {ACCOUNT_TYPES[type].label}
              </Text>
              <Text className="text-xs text-neutral-500">{ACCOUNT_TYPES[type].description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
