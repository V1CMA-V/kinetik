import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

import { ACCOUNT_TYPE_ORDER, ACCOUNT_TYPES, type AccountType } from '../constants';

type Props = {
  value: AccountType;
  onChange: (value: AccountType) => void;
};

export function AccountTypePicker({ value, onChange }: Props) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-muted">Tipo</Text>
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
                selected ? 'border-accent bg-accent-soft' : 'border-outline bg-card'
              }`}
            >
              <Text
                className={`text-base font-semibold ${selected ? 'text-accent-ink' : 'text-ink'}`}
              >
                {ACCOUNT_TYPES[type].label}
              </Text>
              <Text className="text-xs text-ink-muted">{ACCOUNT_TYPES[type].description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
