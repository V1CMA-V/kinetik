import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FormScrollView } from '@/components/form-scroll-view';
import { Screen } from '@/components/screen';
import { alert } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { type Category, useCustomCategories, useDeleteCategory } from '@/features/categories/api';
import {
  BUILT_IN_CATEGORIES,
  CATEGORY_KIND_ORDER,
  CATEGORY_KINDS,
  type CategoryKind,
} from '@/features/categories/categories';
import { CategoryForm } from '@/features/categories/components/category-form';
import { Section } from '@/features/profile/components/settings';
import { useThemeColors } from '@/theme/colors';

const byName = (a: Category, b: Category) =>
  a.name.localeCompare(b.name, 'es-MX', { sensitivity: 'base' });

export default function CategoriesScreen() {
  const custom = useCustomCategories();
  const remove = useDeleteCategory();

  const ofKind = (kind: CategoryKind) =>
    (custom.data ?? []).filter((c) => c.kind === kind).sort(byName);
  const existing: Record<CategoryKind, string[]> = {
    expense: ofKind('expense').map((c) => c.name),
    income: ofKind('income').map((c) => c.name),
  };

  const confirmDelete = (category: Category) =>
    alert(
      'Eliminar categoría',
      `"${category.name}" dejará de aparecer al registrar movimientos. Tus movimientos y presupuestos que ya la usan la conservan.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            remove.mutate(category.id, {
              onError: (error) => alert('No se pudo eliminar la categoría', error.message),
            }),
        },
      ],
    );

  return (
    <Screen>
      <FormScrollView>
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-3xl font-bold text-ink">Categorías</Text>
          <Text className="text-base font-semibold text-accent-ink" onPress={() => router.back()}>
            Listo
          </Text>
        </View>

        <Text className="text-sm text-ink-muted">
          Agrega tus propias categorías para gastos o ingresos. Solo tú las ves.
        </Text>

        <CategoryForm existing={existing} />

        {custom.isError ? (
          <Text className="text-center text-expense">
            No se pudieron cargar tus categorías. Revisa tu conexión.
          </Text>
        ) : null}

        {CATEGORY_KIND_ORDER.map((kind) => (
          <Section key={kind} title={CATEGORY_KINDS[kind].label}>
            {custom.isLoading ? (
              <ActivityIndicator className="py-4" />
            ) : (
              ofKind(kind).map((category) => (
                <CustomCategoryRow
                  key={category.id}
                  category={category}
                  onDelete={() => confirmDelete(category)}
                />
              ))
            )}
            <BuiltInCategories kind={kind} />
          </Section>
        ))}
      </FormScrollView>
    </Screen>
  );
}

function CustomCategoryRow({ category, onDelete }: { category: Category; onDelete: () => void }) {
  const colors = useThemeColors();
  return (
    <View className="min-h-14 flex-row items-center gap-3 border-b border-line px-4 py-3">
      <Text className="flex-1 text-base text-ink">{category.name}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${category.name}`}
        hitSlop={8}
        onPress={onDelete}
        className="active:opacity-70"
      >
        <Icon ios="trash" android="delete" color={colors.expense} size={20} />
      </Pressable>
    </View>
  );
}

/** The fixed categories, shown for reference (they can't be removed). */
function BuiltInCategories({ kind }: { kind: CategoryKind }) {
  return (
    <View className="gap-2 px-4 py-3">
      <Text className="text-xs text-ink-muted">Incluidas en Kinetik</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {BUILT_IN_CATEGORIES[kind].map((name) => (
          <View key={name} className="rounded-full bg-sunken px-2.5 py-1">
            <Text className="text-xs font-medium text-ink-muted">{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
