import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';

import { getDisplayName, useUpdateDisplayName } from '../api';
import { DISPLAY_NAME_MAX_LENGTH, displayNameSchema } from '../schemas';
import { Section, SettingsRow } from './settings';

export function AccountSection() {
  const user = useAuthStore((s) => s.session?.user);
  const displayName = getDisplayName(user);

  return (
    <Section title="Tu cuenta">
      <DisplayNameRow displayName={displayName} />
      <SettingsRow label="Correo" value={user?.email ?? ''} />
      <SettingsRow
        label="Cambiar contraseña"
        onPress={() => router.push('/profile/password')}
        last
      />
    </Section>
  );
}

/** Android has no `Alert.prompt`, so the name is edited inline inside the section. */
function DisplayNameRow({ displayName }: { displayName: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const updateDisplayName = useUpdateDisplayName();

  const startEditing = () => {
    setDraft(displayName ?? '');
    setValidationError(undefined);
    updateDisplayName.reset();
    setIsEditing(true);
  };

  const save = () => {
    const parsed = displayNameSchema.safeParse(draft);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message);
      return;
    }
    setValidationError(undefined);
    if (parsed.data === (displayName ?? '')) {
      setIsEditing(false);
      return;
    }
    updateDisplayName.mutate(parsed.data, { onSuccess: () => setIsEditing(false) });
  };

  if (!isEditing) {
    return <SettingsRow label="Nombre" value={displayName ?? 'Agregar'} onPress={startEditing} />;
  }

  return (
    <View className="gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <Input
        label="Nombre"
        placeholder="Cómo quieres que te llamemos"
        value={draft}
        onChangeText={setDraft}
        autoFocus
        autoCapitalize="words"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        returnKeyType="done"
        onSubmitEditing={save}
        error={validationError ?? updateDisplayName.error?.message}
      />
      <Text className="text-xs text-neutral-500">
        Se muestra en el saludo de Inicio. Déjalo vacío para quitarlo.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title="Cancelar"
            variant="secondary"
            disabled={updateDisplayName.isPending}
            onPress={() => setIsEditing(false)}
          />
        </View>
        <View className="flex-1">
          <Button title="Guardar" loading={updateDisplayName.isPending} onPress={save} />
        </View>
      </View>
    </View>
  );
}
