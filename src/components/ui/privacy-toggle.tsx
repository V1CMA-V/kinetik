import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useSettingsStore } from '@/stores/settings-store';
import { useThemeColors } from '@/theme/colors';

/** Eye button that hides or shows every amount in the app. */
export function PrivacyToggle() {
  const colors = useThemeColors();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const setHideAmounts = useSettingsStore((s) => s.setHideAmounts);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
      hitSlop={8}
      onPress={() => setHideAmounts(!hideAmounts)}
      className="h-11 w-11 items-center justify-center rounded-full bg-sunken active:opacity-60"
      style={{ borderRadius: 22 }}
    >
      <Icon
        ios={hideAmounts ? 'eye.slash' : 'eye'}
        android={hideAmounts ? 'visibility_off' : 'visibility'}
        color={colors.ink}
      />
    </Pressable>
  );
}
