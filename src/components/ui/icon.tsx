import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  /** SF Symbol on iOS, Material Symbol on Android. */
  ios: SFSymbol;
  android: AndroidSymbol;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Platform-native icon (decorative: give the pressable around it the accessibility label). */
export function Icon({ ios, android, color, size = 22, style }: Props) {
  return (
    <SymbolView
      name={{ ios, android }}
      tintColor={color}
      size={size}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
