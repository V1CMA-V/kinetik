import { useColorScheme, vars } from 'nativewind';
import { useMemo } from 'react';

import paletteModule from './palette';

type Palette = (typeof paletteModule.palette)['light'];

const { palette, themeVariables } = paletteModule;

/** CSS variables of each theme, for `vars()` on the root view. */
export const themeVars = {
  light: vars(themeVariables('light')),
  dark: vars(themeVariables('dark')),
};

/**
 * Hex colors of the current theme, for props that can't take a className
 * (navigation themes, tab bar, Switch, ActivityIndicator, placeholderTextColor).
 */
export function useThemeColors(): Palette & { isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return useMemo(() => ({ ...palette[isDark ? 'dark' : 'light'], isDark }), [isDark]);
}
