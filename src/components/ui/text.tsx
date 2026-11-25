import { Text as RNText, type TextProps } from 'react-native';

const TABULAR_NUMS = { fontVariant: ['tabular-nums' as const] };

/**
 * App-wide Text: Inter by default (React Native doesn't inherit fonts and React 19
 * dropped `defaultProps`). Add `font-display` for titles and amounts, and
 * `tabular-nums` for amounts so digits line up (NativeWind ignores that utility,
 * so it's applied here as `fontVariant`).
 */
export function Text({ className, style, ...props }: TextProps & { className?: string }) {
  const hasFamily = className?.includes('font-display') || className?.includes('font-sans');
  const tabular = className?.includes('tabular-nums');
  return (
    <RNText
      className={hasFamily ? className : `font-sans ${className ?? ''}`}
      style={tabular ? [TABULAR_NUMS, style] : style}
      {...props}
    />
  );
}
