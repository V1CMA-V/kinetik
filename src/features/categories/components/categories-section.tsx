import { router } from 'expo-router';

import { Section, SettingsRow } from '@/features/profile/components/settings';

import { useCustomCategories } from '../api';

/** Profile entry point for managing custom categories. */
export function CategoriesSection() {
  const custom = useCustomCategories();
  const count = custom.data?.length;

  return (
    <Section title="Categorías">
      <SettingsRow
        label="Mis categorías"
        icon={{ ios: 'tag', android: 'sell' }}
        description="Agrega las tuyas para gastos e ingresos"
        value={count == null ? undefined : count === 0 ? 'Ninguna' : String(count)}
        onPress={() => router.push('/profile/categories')}
        last
      />
    </Section>
  );
}
