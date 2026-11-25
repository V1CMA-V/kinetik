import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { alert } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { Screen } from '@/components/screen';
import { useAccounts } from '@/features/accounts/api';
import { getDisplayName } from '@/features/profile/api';
import { AccountSection } from '@/features/profile/components/account-section';
import { ArchivedAccountsSection } from '@/features/profile/components/archived-accounts-section';
import { NotificationsSection } from '@/features/profile/components/notifications-section';
import { PrivacySection } from '@/features/profile/components/privacy-section';
import { SecuritySection } from '@/features/profile/components/security-section';
import { ComingSoonPill, Section, SettingsRow } from '@/features/profile/components/settings';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

const schemes = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
] as const;

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const signOut = useAuthStore((s) => s.signOut);
  const displayName = getDisplayName(user);
  const accounts = useAccounts();
  const accountCount = accounts.data?.length;

  const [editingName, setEditingName] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const accountSectionY = useRef(0);

  const editName = () => {
    setEditingName(true);
    scrollRef.current?.scrollTo({ y: accountSectionY.current, animated: true });
  };

  const confirmSignOut = () => {
    alert('Cerrar sesión', '¿Quieres cerrar sesión en este teléfono?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen className="pt-6">
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="gap-8 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <Text className="font-display text-3xl font-bold text-ink">Perfil</Text>

          <View className="flex-row items-center gap-4">
            <View
              className="h-16 w-16 items-center justify-center rounded-full bg-accent"
              style={{ borderRadius: 32 }}
            >
              <Text className="font-display text-2xl font-bold text-on-accent">
                {(displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 gap-0.5">
              <Text numberOfLines={1} className="font-display text-xl font-bold text-ink">
                {displayName ?? 'Sin nombre'}
              </Text>
              {accountCount != null ? (
                <Text className="text-sm text-ink-muted">
                  {accountCount === 1 ? '1 cuenta activa' : `${accountCount} cuentas activas`}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar nombre"
              onPress={editName}
              className="h-10 justify-center rounded-full border border-ink px-4 active:opacity-70"
              style={{ borderRadius: 20 }}
            >
              <Text className="text-sm font-semibold text-ink">Editar</Text>
            </Pressable>
          </View>
        </View>

        <Section title="Apariencia">
          <View className="p-3">
            <View
              accessibilityRole="radiogroup"
              className="flex-row rounded-full bg-sunken p-1"
              style={{ borderRadius: 999 }}
            >
              {schemes.map((s) => (
                <SchemeSegment key={s.value} value={s.value} label={s.label} />
              ))}
            </View>
          </View>
        </Section>

        <View
          onLayout={(e) => {
            accountSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <AccountSection editingName={editingName} onEditingNameChange={setEditingName} />
        </View>
        <SecuritySection />
        <NotificationsSection />
        <PrivacySection />
        <ArchivedAccountsSection />

        <Section title="Preferencias">
          <SettingsRow
            label="Moneda"
            icon={{ ios: 'dollarsign.circle', android: 'attach_money' }}
            disabled
            right={<PreferenceValue value="MXN" />}
          />
          <SettingsRow
            label="Idioma"
            icon={{ ios: 'globe', android: 'language' }}
            disabled
            right={<PreferenceValue value="Español" />}
            last
          />
        </Section>

        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          className="h-12 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
          style={{ borderRadius: 24 }}
        >
          <Text className="text-base font-semibold text-expense">Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function PreferenceValue({ value }: { value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-sm text-ink-muted">{value}</Text>
      <ComingSoonPill />
    </View>
  );
}

function SchemeSegment({
  value,
  label,
}: {
  value: (typeof schemes)[number]['value'];
  label: string;
}) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);
  const selected = colorScheme === value;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => setColorScheme(value)}
      className={`h-10 flex-1 items-center justify-center rounded-full ${
        selected ? 'bg-accent' : 'active:opacity-70'
      }`}
      style={{ borderRadius: 20 }}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-on-accent' : 'text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
