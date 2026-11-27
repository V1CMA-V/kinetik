import { Pressable, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

type Props = {
  query: string;
  onChangeQuery: (query: string) => void;
  /** Filters set apart from the text (shown as a badge on the button). */
  filterCount: number;
  onPressFilters: () => void;
};

/** Search field with a clear button, next to the "Filtros" button. */
export function TransactionSearchBar({ query, onChangeQuery, filterCount, onPressFilters }: Props) {
  const colors = useThemeColors();
  const hasFilters = filterCount > 0;

  return (
    <View className="flex-row items-center gap-2">
      <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full bg-sunken pl-4 pr-2">
        <Icon ios="magnifyingglass" android="search" color={colors['ink-muted']} size={18} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Buscar movimientos"
          placeholderTextColor={colors['ink-muted']}
          accessibilityLabel="Buscar movimientos"
          returnKeyType="search"
          autoCorrect={false}
          className="h-full flex-1 font-sans text-base text-ink"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            hitSlop={8}
            onPress={() => onChangeQuery('')}
            className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
          >
            <Icon ios="xmark.circle.fill" android="cancel" color={colors['ink-muted']} size={18} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasFilters ? `Filtros, ${filterCount} activos` : 'Filtros'}
        onPress={onPressFilters}
        className={`h-11 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-70 ${
          hasFilters ? 'bg-ink' : 'bg-sunken'
        }`}
      >
        <Icon
          ios="line.3.horizontal.decrease"
          android="filter_list"
          color={hasFilters ? colors.surface : colors.ink}
          size={18}
        />
        <Text className={`text-sm font-semibold ${hasFilters ? 'text-surface' : 'text-ink'}`}>
          {hasFilters ? `Filtros · ${filterCount}` : 'Filtros'}
        </Text>
      </Pressable>
    </View>
  );
}
