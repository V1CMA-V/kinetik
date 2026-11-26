import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import { verifyEmailSchema, type VerifyEmailValues } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

/** Supabase only lets you request a new email every 60 s. */
const RESEND_SECONDS = 60;

/**
 * Confirms a new account with the code from the email instead of its link,
 * which would need a website or deep link to land on.
 */
export default function VerifyEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  // The sign-up just sent the first email.
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const { control, handleSubmit, formState, setError } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
  });

  // A valid code signs the person in; the root layout then moves to the app.
  const verify = useMutation({
    mutationFn: async ({ code }: VerifyEmailValues) => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;
    },
    onError: (error) => setError('code', { message: authErrorMessage(error) }),
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
    },
    onSuccess: () => setCooldown(RESEND_SECONDS),
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));

  return (
    <Screen>
      <FormScrollView centered contentContainerStyle={{ gap: 32 }}>
        <View className="gap-2">
          <Text className="font-display text-3xl font-bold text-ink">Confirma tu correo</Text>
          <Text className="text-base text-ink-muted">
            Te enviamos un código a <Text className="font-semibold text-ink">{email}</Text>.
            Escríbelo aquí para activar tu cuenta. Revisa también la carpeta de spam.
          </Text>
        </View>

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
              autoFocus
              maxLength={8}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={formState.errors.code?.message}
            />
          )}
        />

        <View className="gap-3">
          <Button
            title="Confirmar cuenta"
            loading={verify.isPending}
            onPress={() => handleSubmit((values) => verify.mutate(values))()}
          />
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: cooldown > 0 || resend.isPending }}
              disabled={cooldown > 0 || resend.isPending}
              onPress={() => resend.mutate()}
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
              onPress={back}
              className="h-11 justify-center active:opacity-60"
            >
              <Text className="text-sm font-semibold text-accent-ink">Usar otro correo</Text>
            </Pressable>
          </View>
          {resend.error ? (
            <Text className="text-sm text-expense">{authErrorMessage(resend.error)}</Text>
          ) : null}
        </View>
      </FormScrollView>
    </Screen>
  );
}
