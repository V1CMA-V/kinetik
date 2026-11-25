import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Banco <Text className="font-normal text-neutral-500">(opcional)</Text>
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
                selected
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selected ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
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
        <Text className="text-sm text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
