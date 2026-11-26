import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAcceptInvite } from '@/features/household/api';

const CODE_LENGTH = 6;

/** Join a partner's household with their invite code (also opened by kinetik://profile/join?code=…). */
export default function JoinHouseholdScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => normalize(params.code ?? ''));
  const accept = useAcceptInvite();

  const join = () => accept.mutate(code, { onSuccess: () => router.dismissTo('/profile') });

  return (
    <Screen>
      <FormScrollView>
        <View className="gap-2">
          <Text className="font-display text-3xl font-bold text-ink">Unirme al hogar</Text>
          <Text className="text-base text-ink-muted">
            Escribe el código que te compartió tu pareja. Verás las cuentas que comparta contigo y
            podrás registrar gastos en ellas.
          </Text>
        </View>

        <Input
          label="Código"
          placeholder="Ej. K7M4QX"
          value={code}
          onChangeText={(text) => setCode(normalize(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={!params.code}
          maxLength={CODE_LENGTH}
          error={accept.error?.message}
          returnKeyType="done"
          onSubmitEditing={() => (code.length === CODE_LENGTH ? join() : undefined)}
        />

        <View className="gap-3">
          <Button
            title="Unirme"
            loading={accept.isPending}
            disabled={code.length !== CODE_LENGTH}
            onPress={join}
          />
          <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FormScrollView>
    </Screen>
  );
}

/** Uppercase, without spaces or characters that never appear in a code. */
function normalize(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}
