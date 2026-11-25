import { View } from 'react-native';

type Props = {
  /** Width of the whole mark in px; the bars keep the logo's proportions. */
  size?: number;
};

// Proportions from the logo (1024 grid): bars 420×124, offset 90 per step, gap 36.
const BAR_W = 420 / 600;
const BAR_H = 124 / 600;
const STEP = 90 / 600;
const GAP = 36 / 600;

/**
 * The "Capas" symbol: three stepped pills, the top one orange. The lower bars use
 * `ink`, so they turn cream on dark backgrounds (the reverse version).
 */
export function LogoMark({ size = 48 }: Props) {
  const bar = { width: size * BAR_W, height: size * BAR_H, borderRadius: (size * BAR_H) / 2 };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kinetik"
      style={{ width: size, gap: size * GAP }}
    >
      <View className="bg-accent" style={[bar, { marginLeft: size * STEP * 2 }]} />
      <View className="bg-ink" style={[bar, { marginLeft: size * STEP }]} />
      <View className="bg-ink" style={bar} />
    </View>
  );
}
