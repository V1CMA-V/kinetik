import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signIn = useMutation({
    mutationFn: async ({ email, password }: SignInValues) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });

  const signUp = useMutation({
    mutationFn: async ({ email, password }: SignInValues) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
  });

  const error = signIn.error ?? signUp.error;

  return (
    <Screen>
      <FormScrollView centered contentContainerStyle={{ gap: 32 }}>
        <View className="gap-2">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-white">Kinetik</Text>
          <Text className="text-base text-neutral-500">Inicia sesión para continuar</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Correo"
                placeholder="tu@correo.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Contraseña"
                placeholder="••••••"
                secureTextEntry
                autoComplete="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.password?.message}
              />
            )}
          />
          {error ? <Text className="text-sm text-red-500">{error.message}</Text> : null}
          {signUp.isSuccess ? (
            <Text className="text-sm text-green-600">
              Revisa tu correo para confirmar la cuenta.
            </Text>
          ) : null}
        </View>

        <View className="gap-3">
          <Button
            title="Iniciar sesión"
            loading={signIn.isPending}
            onPress={() => handleSubmit((values) => signIn.mutate(values))()}
          />
          <Button
            title="Crear cuenta"
            variant="secondary"
            loading={signUp.isPending}
            onPress={() => handleSubmit((values) => signUp.mutate(values))()}
          />
        </View>
      </FormScrollView>
    </Screen>
  );
}
