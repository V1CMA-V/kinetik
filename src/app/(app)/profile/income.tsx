import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  useDeleteIncomeProfile,
  useIncomeProfile,
  useSaveIncomeProfile,
} from '@/features/income/api';
import { IncomeForm, RemoveIncomeButton } from '@/features/income/components/income-form';
import { EMPTY_INCOME_FORM, incomeToFormValues } from '@/features/income/schemas';

export default function IncomeScreen() {
  const profile = useIncomeProfile();
  const save = useSaveIncomeProfile();
  const remove = useDeleteIncomeProfile();

  if (profile.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  // Without the saved profile, an empty form would overwrite it on save.
  if (profile.data === undefined) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center text-base text-ink">
            No se pudieron cargar tus datos de ingreso. Revisa tu conexión.
          </Text>
          <Button
            title="Reintentar"
            loading={profile.isFetching}
            onPress={() => profile.refetch()}
          />
          <Button title="Cerrar" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const confirmRemove = () => {
    alert(
      'Borrar datos de ingreso',
      'Dejarás de ver proyecciones y sugerencias basadas en tu ingreso. Tus movimientos no cambian.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  return (
    <IncomeForm
      // Remount once loaded so the saved values become the defaults.
      key={profile.data ? 'edit' : 'new'}
      defaultValues={profile.data ? incomeToFormValues(profile.data) : EMPTY_INCOME_FORM}
      onSubmit={(values) => save.mutate(values, { onSuccess: () => router.back() })}
      isSubmitting={save.isPending}
      error={save.error?.message ?? remove.error?.message ?? profile.error?.message}
    >
      {profile.data ? (
        <RemoveIncomeButton onPress={confirmRemove} disabled={remove.isPending} />
      ) : null}
    </IncomeForm>
  );
}
