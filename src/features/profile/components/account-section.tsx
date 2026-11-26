import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';

import { getDisplayName, useUpdateDisplayName } from '../api';
import { DISPLAY_NAME_MAX_LENGTH, displayNameSchema } from '../schemas';
import { Section, SettingsRow } from './settings';

type AccountSectionProps = {
  /** Controlled from the screen so the header "Editar" button can open the name editor. */
  editingName: boolean;
  onEditingNameChange: (editing: boolean) => void;
};

export function AccountSection({ editingName, onEditingNameChange }: AccountSectionProps) {
  const user = useAuthStore((s) => s.session?.user);
  const displayName = getDisplayName(user);

  return (
    <Section title="Cuenta">
      <DisplayNameRow
        displayName={displayName}
        isEditing={editingName}
        setIsEditing={onEditingNameChange}
      />
      <SettingsRow
        label="Correo"
        icon={{ ios: 'envelope', android: 'mail' }}
        value={user?.email ?? ''}
      />
      <SettingsRow
        label="Cambiar contraseña"
        icon={{ ios: 'lock', android: 'lock' }}
        onPress={() => router.push('/profile/password')}
      />
      <SettingsRow
        label="Eliminar cuenta"
        description="Borra tu cuenta y todos tus datos"
        icon={{ ios: 'trash', android: 'delete' }}
        destructive
        onPress={() => router.push('/profile/delete-account')}
        last
      />
    </Section>
  );
}

/** Android has no `Alert.prompt`, so the name is edited inline inside the section. */
function DisplayNameRow({
  displayName,
  isEditing,
  setIsEditing,
}: {
  displayName: string | null;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const updateDisplayName = useUpdateDisplayName();

  // Editing can also be opened from outside (the header "Editar" button): reset the
  // draft whenever the editor opens, during render instead of in an effect.
  const [wasEditing, setWasEditing] = useState(isEditing);
  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing) {
      setDraft(displayName ?? '');
      setValidationError(undefined);
    }
  }

  // Clear the previous save error when the editor opens (mutation state, so not in render).
  const { reset } = updateDisplayName;
  useEffect(() => {
    if (isEditing) reset();
  }, [isEditing, reset]);

  const startEditing = () => setIsEditing(true);

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
    return (
      <SettingsRow
        label="Nombre"
        icon={{ ios: 'person', android: 'person' }}
        value={displayName ?? 'Agregar'}
        onPress={startEditing}
      />
    );
  }

  return (
    <View className="gap-3 border-b border-line px-4 py-3">
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
      <Text className="text-xs text-ink-muted">
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
