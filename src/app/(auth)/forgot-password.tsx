import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
  resetRequestSchema,
  type ResetRequestValues,
} from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

/** Supabase only lets you request a new email every 60 s. */
const RESEND_SECONDS = 60;

/**
 * "¿Olvidaste tu contraseña?" with a code instead of a link: no deep links involved.
 * Step 1 emails the code, step 2 checks it and sets the new password.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = useMutation({
    mutationFn: async (address: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(address);
      if (error) throw error;
      return address;
    },
    onSuccess: (address) => {
      setEmail(address);
      setCooldown(RESEND_SECONDS);
    },
  });

  return (
    <Screen>
      <FormScrollView centered contentContainerStyle={{ gap: 32 }}>
        {email ? (
          <CodeStep
            email={email}
            cooldown={cooldown}
            resending={sendCode.isPending}
            resendError={sendCode.error ? authErrorMessage(sendCode.error) : undefined}
            onResend={() => sendCode.mutate(email)}
            onChangeEmail={() => {
              sendCode.reset();
              setEmail(null);
            }}
          />
        ) : (
          <EmailStep
            defaultEmail={params.email ?? ''}
            sending={sendCode.isPending}
            error={sendCode.error ? authErrorMessage(sendCode.error) : undefined}
            onSubmit={(address) => sendCode.mutate(address)}
          />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
          className="h-11 items-center justify-center active:opacity-60"
        >
          <Text className="text-base font-semibold text-accent-ink">Volver a iniciar sesión</Text>
        </Pressable>
      </FormScrollView>
    </Screen>
  );
}

function EmailStep({
  defaultEmail,
  sending,
  error,
  onSubmit,
}: {
  defaultEmail: string;
  sending: boolean;
  error?: string;
  onSubmit: (email: string) => void;
}) {
  const { control, handleSubmit, formState } = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <>
      <View className="gap-2">
        <Text className="font-display text-3xl font-bold text-ink">Recupera tu cuenta</Text>
        <Text className="text-base text-ink-muted">
          Te enviaremos un código a tu correo para que elijas una contraseña nueva.
        </Text>
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
        {error ? <Text className="text-sm text-expense">{error}</Text> : null}
      </View>

      <Button
        title="Enviar código"
        loading={sending}
        onPress={() => handleSubmit((values) => onSubmit(values.email.trim()))()}
      />
    </>
  );
}

function CodeStep({
  email,
  cooldown,
  resending,
  resendError,
  onResend,
  onChangeEmail,
}: {
  email: string;
  cooldown: number;
  resending: boolean;
  resendError?: string;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  const { control, handleSubmit, formState, setError } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '', confirm: '' },
  });

  const reset = useMutation({
    mutationFn: async ({ code, password }: ResetPasswordValues) => {
      // Checking the code signs the person in, so the root layout will move to the app.
      // Both calls run in this one function, so the password change still completes.
      const verified = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (verified.error) throw verified.error;

      const updated = await supabase.auth.updateUser({ password });
      if (updated.error) {
        Alert.alert(
          'Entraste, pero no cambiamos tu contraseña',
          `${authErrorMessage(updated.error)} Puedes cambiarla en Perfil → Contraseña.`,
        );
        return;
      }
      Alert.alert('Contraseña actualizada', 'Usa tu nueva contraseña la próxima vez que entres.');
    },
    onError: (error) => setError('code', { message: authErrorMessage(error) }),
  });

  return (
    <>
      <View className="gap-2">
        <Text className="font-display text-3xl font-bold text-ink">Escribe el código</Text>
        <Text className="text-base text-ink-muted">
          Si hay una cuenta con <Text className="font-semibold text-ink">{email}</Text>, te enviamos
          un código. Revisa también la carpeta de spam.
        </Text>
      </View>

      <View className="gap-4">
        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Código"
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={8}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.code?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoComplete="new-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirm"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirmar nueva contraseña"
              secureTextEntry
              autoComplete="new-password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.confirm?.message}
            />
          )}
        />
      </View>

      <View className="gap-3">
        <Button
          title="Cambiar contraseña"
          loading={reset.isPending}
          onPress={() => handleSubmit((values) => reset.mutate(values))()}
        />
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: cooldown > 0 || resending }}
            disabled={cooldown > 0 || resending}
            onPress={onResend}
            className="h-11 justify-center active:opacity-60"
          >
            <Text
              className={`text-sm font-semibold tabular-nums ${
                cooldown > 0 ? 'text-ink-muted' : 'text-accent-ink'
              }`}
            >
              {cooldown > 0 ? `Reenviar código en ${cooldown} s` : 'Reenviar código'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onChangeEmail}
            className="h-11 justify-center active:opacity-60"
          >
            <Text className="text-sm font-semibold text-accent-ink">Usar otro correo</Text>
          </Pressable>
        </View>
        {resendError ? <Text className="text-sm text-expense">{resendError}</Text> : null}
      </View>
    </>
  );
}
