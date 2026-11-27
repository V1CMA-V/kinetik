import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { TRANSACTION_KINDS } from '@/features/transactions/constants';

import { DUPLICATE_CATEGORY_MESSAGE, useCreateCategory } from '../api';
import {
  CATEGORY_KIND_ORDER,
  CATEGORY_KINDS,
  type CategoryKind,
  includesCategory,
} from '../categories';
import {
  categorySchema,
  EMPTY_CATEGORY_FORM,
  type CategoryFormInput,
  type CategoryFormOutput,
} from '../schemas';

type Props = {
  /** Your custom category names by kind, to catch repeats before saving. */
  existing: Record<CategoryKind, string[]>;
};

/** Name + kind form that adds a custom category and clears itself for the next one. */
export function CategoryForm({ existing }: Props) {
  const create = useCreateCategory();
  const { control, handleSubmit, formState, setError, reset } = useForm<
    CategoryFormInput,
    unknown,
    CategoryFormOutput
  >({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY_CATEGORY_FORM,
  });

  const submit = handleSubmit((values) => {
    // The database only ignores case; this also catches "Bebe" vs "Bebé".
    if (includesCategory(existing[values.kind], values.name)) {
      setError('name', { message: DUPLICATE_CATEGORY_MESSAGE });
      return;
    }
    create.mutate(values, { onSuccess: () => reset({ kind: values.kind, name: '' }) });
  });

  return (
    <View className="gap-4 rounded-card border border-line bg-card p-4">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Nueva categoría"
            placeholder="Ej. Mascotas"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={40}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={() => submit()}
            error={formState.errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="kind"
        render={({ field: { onChange, value } }) => (
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-ink-muted">Tipo</Text>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {CATEGORY_KIND_ORDER.map((kind) => (
                <Chip
                  key={kind}
                  label={TRANSACTION_KINDS[kind].label}
                  accessibilityHint={`Para tus ${CATEGORY_KINDS[kind].label.toLowerCase()}`}
                  selected={value === kind}
                  onPress={() => onChange(kind)}
                />
              ))}
            </View>
          </View>
        )}
      />

      {create.error ? <Text className="text-sm text-expense">{create.error.message}</Text> : null}

      <Button title="Agregar" loading={create.isPending} onPress={() => submit()} />
    </View>
  );
}
