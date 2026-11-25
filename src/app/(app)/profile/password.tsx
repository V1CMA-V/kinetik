import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileError, useChangePassword } from '@/features/profile/api';
import {
  changePasswordSchema,
  type ChangePasswordInput,
  type ChangePasswordOutput,
} from '@/features/profile/schemas';

const FIELDS = [
  { name: 'current', label: 'Contraseña actual', autoComplete: 'current-password' },
  { name: 'next', label: 'Nueva contraseña', autoComplete: 'new-password' },
  { name: 'confirm', label: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
] as const;

export default function ChangePasswordScreen() {
  const changePassword = useChangePassword();
  const { control, handleSubmit, formState, setError } = useForm<
    ChangePasswordInput,
    unknown,
    ChangePasswordOutput
  >({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const submit = handleSubmit((values) =>
    changePassword.mutate(values, {
      onSuccess: () => {
        alert('Contraseña actualizada', 'Usa tu nueva contraseña la próxima vez que entres.');
        router.back();
      },
      onError: (error) => {
        // Field-specific errors go under their input instead of the general message.
        if (error instanceof ProfileError && error.field) {
          setError(error.field, { message: error.message });
        }
      },
    }),
  );

  const error = changePassword.error;
  const generalError =
    error && !(error instanceof ProfileError && error.field) ? error.message : undefined;

  return (
    <Screen>
      <FormScrollView>
        <Text className="font-display text-3xl font-bold text-ink">Cambiar contraseña</Text>

        <View className="gap-4">
          {FIELDS.map((field) => (
            <Controller
              key={field.name}
              control={control}
              name={field.name}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={field.label}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={field.autoComplete}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={formState.errors[field.name]?.message}
                />
              )}
            />
          ))}
          <Text className="text-xs text-ink-muted">
            La nueva contraseña debe tener al menos 8 caracteres.
          </Text>
        </View>

        {generalError ? <Text className="text-sm text-expense">{generalError}</Text> : null}

        <View className="gap-3">
          <Button title="Guardar" loading={changePassword.isPending} onPress={() => submit()} />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}
