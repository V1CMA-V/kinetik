import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';

import { INSTITUTIONS } from '../constants';

type Props = {
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
};

const OTHER = 'Otro';

export function InstitutionPicker({ value = '', onChange, error }: Props) {
  const isKnown = (INSTITUTIONS as readonly string[]).includes(value);
  const [showOther, setShowOther] = useState(value !== '' && !isKnown);

  const options = [...INSTITUTIONS, OTHER];

  const select = (option: string) => {
    if (option === OTHER) {
      setShowOther(true);
      onChange('');
      return;
    }
    setShowOther(false);
    onChange(option === value ? '' : option);
  };

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-muted">
        Banco <Text className="font-normal text-ink-muted">(opcional)</Text>
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-1"
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => {
          const selected = option === OTHER ? showOther : !showOther && option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => select(option)}
              className={`rounded-full border px-4 py-2 active:opacity-80 ${
                selected ? 'border-accent bg-accent' : 'border-outline bg-card'
              }`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-on-accent' : 'text-ink'}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {showOther ? (
        <Input
          placeholder="Nombre del banco"
          value={value}
          onChangeText={onChange}
          error={error}
          autoFocus
        />
      ) : error ? (
        <Text className="text-sm text-expense">{error}</Text>
      ) : null}
    </View>
  );
}
