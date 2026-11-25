import { router, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/theme/colors';

/** Floating primary action, bottom-right of the screen. */
export function Fab({ label, href }: { label: string; href: Href }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Agregar ${label.toLowerCase()}`}
      onPress={() => router.push(href)}
      className="absolute bottom-4 right-6 h-14 flex-row items-center gap-2 rounded-full bg-accent pl-4 pr-5 active:opacity-85"
      style={{
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <Icon ios="plus" android="add" color={colors['on-accent']} size={24} />
      <Text className="text-base font-semibold text-on-accent">{label}</Text>
    </Pressable>
  );
}
