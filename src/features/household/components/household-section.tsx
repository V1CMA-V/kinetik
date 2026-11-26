import { router } from 'expo-router';
import { ActivityIndicator, Share, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Section, SettingsRow } from '@/features/profile/components/settings';

import { useCreateInvite, useHousehold, useLeaveHousehold } from '../api';

/** Deep link that opens the join screen with the code filled in. */
const joinLink = (code: string) => `kinetik://profile/join?code=${code}`;

function hoursLeft(expiresAt: string) {
  const hours = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return hours <= 1 ? 'Vence en menos de una hora' : `Vence en ${hours} horas`;
}

/** Profile section to invite a partner, join their household or leave it. */
export function HouseholdSection() {
  const household = useHousehold();
  const createInvite = useCreateInvite();
  const leave = useLeaveHousehold();

  const data = household.data;
  const partner = data?.members.find((m) => !m.isMe) ?? null;
  const error = createInvite.error?.message ?? leave.error?.message;

  const confirmLeave = () => {
    alert(
      partner ? 'Salir del hogar' : 'Cancelar invitación',
      partner
        ? `Dejarán de ver las cuentas que se comparten entre ${partner.name ?? 'tu pareja'} y tú.`
        : 'El código dejará de funcionar.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: partner ? 'Salir' : 'Cancelar invitación',
          style: 'destructive',
          onPress: () => leave.mutate(),
        },
      ],
    );
  };

  const shareInvite = (code: string) =>
    Share.share({
      message: `Únete a mi hogar en Kinetik para compartir nuestras cuentas. Abre la app, ve a Perfil › Pareja › Tengo un código y escribe: ${code}\n\n${joinLink(code)}`,
    });

  if (household.isPending) {
    return (
      <Section title="Pareja">
        <View className="items-center p-4">
          <ActivityIndicator />
        </View>
      </Section>
    );
  }

  // Already sharing with a partner.
  if (partner) {
    return (
      <Section title="Pareja">
        <SettingsRow
          label={`Compartes con ${partner.name ?? 'tu pareja'}`}
          description="Para compartir una cuenta, edítala y activa «Compartir»."
          icon={{ ios: 'person.2', android: 'group' }}
        />
        <SettingsRow label="Salir del hogar" destructive onPress={confirmLeave} last />
      </Section>
    );
  }

  // Waiting for the partner to join.
  if (data?.invite) {
    const { code, expiresAt } = data.invite;
    return (
      <Section title="Pareja">
        <View className="gap-4 p-4">
          <View className="gap-1">
            <Text className="text-sm text-ink-muted">Comparte este código con tu pareja</Text>
            <Text
              selectable
              className="font-display text-4xl font-bold tracking-widest text-ink"
              accessibilityLabel={`Código ${code.split('').join(' ')}`}
            >
              {code}
            </Text>
            <Text className="text-xs text-ink-muted">
              {hoursLeft(expiresAt)}, solo se usa una vez.
            </Text>
          </View>
          <Button title="Compartir código" onPress={() => shareInvite(code)} />
          <Button
            title="Generar otro código"
            variant="secondary"
            loading={createInvite.isPending}
            onPress={() => createInvite.mutate()}
          />
          {error ? <Text className="text-sm text-expense">{error}</Text> : null}
        </View>
        <View className="border-t border-line">
          <SettingsRow label="Cancelar invitación" destructive onPress={confirmLeave} last />
        </View>
      </Section>
    );
  }

  return (
    <Section title="Pareja">
      <SettingsRow
        label="Invitar a mi pareja"
        description="Comparte cuentas para que los dos vean el saldo y registren gastos."
        icon={{ ios: 'person.badge.plus', android: 'person_add' }}
        onPress={() => createInvite.mutate()}
        right={createInvite.isPending ? <ActivityIndicator /> : undefined}
      />
      <SettingsRow
        label="Tengo un código"
        icon={{ ios: 'number', android: 'pin' }}
        onPress={() => router.push('/profile/join')}
        last={!error}
      />
      {error ? <Text className="px-4 pb-3 text-sm text-expense">{error}</Text> : null}
    </Section>
  );
}
