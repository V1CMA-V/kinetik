import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { usePartner } from '@/features/household/api';
import { useDeleteAccount } from '@/features/profile/api';
import { useAuthStore } from '@/stores/auth-store';

/** Typed to confirm, so the account can't be deleted by an accidental tap. */
const CONFIRM_WORD = 'ELIMINAR';

const DELETED = [
  'Tus cuentas, movimientos, suscripciones y presupuestos.',
  'Tus metas de ahorro y sus aportaciones.',
  'Tu perfil, tu correo y tu acceso a Kinetik.',
];

export default function DeleteAccountScreen() {
  const email = useAuthStore((s) => s.session?.user.email);
  const { partner } = usePartner();
  const deleteAccount = useDeleteAccount();
  const [confirmation, setConfirmation] = useState('');

  const confirmed = confirmation.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <Screen>
      <FormScrollView>
        <View className="gap-2">
          <Text className="font-display text-3xl font-bold text-ink">Eliminar cuenta</Text>
          <Text className="text-base text-ink-muted">
            Se borrará para siempre la cuenta{email ? ` ${email}` : ''} y todos sus datos. No se
            puede deshacer.
          </Text>
        </View>

        <View className="gap-3 rounded-card border border-line bg-card p-4">
          <Text className="text-sm font-semibold text-ink">Qué se elimina</Text>
          {DELETED.map((item) => (
            <View key={item} className="flex-row gap-2">
              <Text className="text-sm text-expense">•</Text>
              <Text className="flex-1 text-sm text-ink">{item}</Text>
            </View>
          ))}
        </View>

        {partner ? (
          <View className="gap-1 rounded-card bg-sunken p-4">
            <Text className="text-sm font-semibold text-ink">Modo pareja</Text>
            <Text className="text-sm text-ink-muted">
              {partner.name} conserva sus cuentas y sus saldos no cambian. Dejará de ver tus cuentas
              compartidas y tus metas, y el hogar queda a su cargo.
            </Text>
          </View>
        ) : null}

        <Input
          label={`Escribe ${CONFIRM_WORD} para confirmar`}
          placeholder={CONFIRM_WORD}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          editable={!deleteAccount.isPending}
          returnKeyType="done"
        />

        {deleteAccount.error ? (
          <Text className="text-sm text-expense">{deleteAccount.error.message}</Text>
        ) : null}

        <View className="gap-3">
          <Button
            title="Eliminar mi cuenta"
            variant="destructive"
            disabled={!confirmed}
            loading={deleteAccount.isPending}
            onPress={() => deleteAccount.mutate()}
          />
          <Button
            title="Cancelar"
            variant="secondary"
            disabled={deleteAccount.isPending}
            onPress={() => router.back()}
          />
        </View>
      </FormScrollView>
    </Screen>
  );
}
