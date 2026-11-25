import { router } from 'expo-router';
import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { LogoMark } from '@/components/logo-mark';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  AnalysisVignette,
  NetWorthVignette,
  PaymentVignette,
} from '@/features/onboarding/components/vignettes';
import { useSettingsStore } from '@/stores/settings-store';

type Page = { title: string; body: string; vignette: ReactNode };

const PAGES: Page[] = [
  {
    title: 'Todo tu dinero en un lugar',
    body: 'Cuentas, efectivo e inversiones, con tu patrimonio neto real.',
    vignette: <NetWorthVignette />,
  },
  {
    title: 'Paga tus tarjetas a tiempo',
    body: 'Kinetik calcula tu fecha de corte, cuánto pagar y tus meses sin intereses.',
    vignette: <PaymentVignette />,
  },
  {
    title: 'Sabe a dónde se va tu dinero',
    body: 'Presupuestos, suscripciones y análisis de cada mes.',
    vignette: <AnalysisVignette />,
  },
];

/** Welcome screens, shown once before the first sign-in. */
export default function WelcomeScreen() {
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;

  const finish = () => {
    router.replace('/sign-in');
    completeOnboarding();
  };

  const goTo = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: !reduceMotion });
    setPage(index);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  // The one orchestrated moment: logo and first panel rise in on launch.
  const enter = (delay: number) =>
    reduceMotion ? undefined : FadeInDown.duration(500).delay(delay);

  return (
    <SafeAreaView className="flex-1 bg-surface pb-4 pt-4">
      <View className="h-11 flex-row items-center justify-between px-6">
        <Animated.View entering={enter(0)} className="flex-row items-center gap-3">
          <LogoMark size={32} />
          <Text className="font-display text-xl font-bold text-ink">Kinetik</Text>
        </Animated.View>
        {isLast ? null : (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={finish}
            className="h-11 justify-center px-2 active:opacity-60"
          >
            <Text className="text-base font-semibold text-ink-muted">Omitir</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onMomentumScrollEnd={onScrollEnd}
        className="flex-1"
      >
        {PAGES.map((p, i) => (
          <View key={p.title} style={{ width }} className="justify-center gap-8 px-6">
            <Animated.View
              entering={i === 0 ? enter(150) : undefined}
              className="justify-center rounded-card bg-accent p-5"
              style={{ minHeight: 260 }}
            >
              {p.vignette}
            </Animated.View>
            <View className="gap-3">
              <Text className="font-display text-4xl font-bold leading-tight text-ink">
                {p.title}
              </Text>
              <Text className="text-base leading-6 text-ink-muted">{p.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="gap-5 px-6">
        <View className="flex-row justify-center gap-2">
          {PAGES.map((p, i) => (
            <Pressable
              key={p.title}
              accessibilityRole="button"
              accessibilityLabel={`Página ${i + 1} de ${PAGES.length}`}
              accessibilityState={{ selected: i === page }}
              hitSlop={10}
              onPress={() => goTo(i)}
            >
              <View
                className={`h-2 rounded-full ${i === page ? 'w-6 bg-accent' : 'w-2 bg-outline/50'}`}
              />
            </Pressable>
          ))}
        </View>
        <Button
          title={isLast ? 'Empezar' : 'Siguiente'}
          onPress={isLast ? finish : () => goTo(page + 1)}
        />
      </View>
    </SafeAreaView>
  );
}
