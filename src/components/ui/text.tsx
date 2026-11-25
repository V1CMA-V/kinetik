import { Text as RNText, type TextProps } from 'react-native';

/**
 * App-wide Text: Inter by default (React Native doesn't inherit fonts and React 19
 * dropped `defaultProps`). Add `font-display` for titles and amounts.
 */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  const hasFamily = className?.includes('font-display') || className?.includes('font-sans');
  return <RNText className={hasFamily ? className : `font-sans ${className ?? ''}`} {...props} />;
}
