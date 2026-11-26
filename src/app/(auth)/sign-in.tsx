import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { FormScrollView } from '@/components/form-scroll-view';
import { LogoMark } from '@/components/logo-mark';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authErrorMessage } from '@/features/auth/errors';
import { signInWithGoogle } from '@/features/auth/google';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/theme/colors';

export default function SignInScreen() {
  const { control, handleSubmit, formState, getValues } = useForm<SignInValues>({
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

  const google = useMutation({ mutationFn: signInWithGoogle });

  const error = google.error ?? signIn.error ?? signUp.error;

  return (
    <Screen>
      <FormScrollView centered contentContainerStyle={{ gap: 32 }}>
        <View className="gap-2">
          <LogoMark size={56} />
          <Text className="mt-4 font-display text-4xl font-bold text-ink">Kinetik</Text>
          <Text className="text-base text-ink-muted">Inicia sesión para continuar</Text>
        </View>

        <View className="gap-5">
          <GoogleButton loading={google.isPending} onPress={() => google.mutate()} />
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-line" />
            <Text className="text-sm text-ink-muted">o con tu correo</Text>
            <View className="h-px flex-1 bg-line" />
          </View>
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
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: '/forgot-password',
                params: { email: getValues('email').trim() },
              })
            }
            className="-mt-1 h-11 justify-center self-end active:opacity-60"
          >
            <Text className="text-sm font-semibold text-accent-ink">¿Olvidaste tu contraseña?</Text>
          </Pressable>
          {error ? <Text className="text-sm text-expense">{authErrorMessage(error)}</Text> : null}
          {signUp.isSuccess ? (
            <Text className="text-sm text-income">Revisa tu correo para confirmar la cuenta.</Text>
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

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/privacy-policy')}
          className="self-center active:opacity-60"
        >
          <Text className="text-center text-xs text-ink-muted">
            Al continuar aceptas el{' '}
            <Text className="text-xs font-semibold text-accent-ink">Aviso de privacidad</Text>
          </Text>
        </Pressable>
      </FormScrollView>
    </Screen>
  );
}

/** "Continuar con Google", with Google's own "G" mark as its brand guidelines ask. */
function GoogleButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      className="h-12 flex-row items-center justify-center gap-3 rounded-full border border-outline bg-card px-5 active:opacity-80 disabled:opacity-60"
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Image
            source={require('@/assets/images/google-g.png')}
            style={{ width: 20, height: 20 }}
            contentFit="contain"
            accessible={false}
          />
          <Text className="text-base font-semibold text-ink">Continuar con Google</Text>
        </>
      )}
    </Pressable>
  );
}
