import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { CONTACT_EMAIL, POLICY_UPDATED_ON } from '@/features/legal/constants';
import { PRIVACY_POLICY, PRIVACY_POLICY_INTRO } from '@/features/legal/privacy-policy';
import { parseISODate } from '@/lib/date';
import { useThemeColors } from '@/theme/colors';

const updatedOn = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(
  parseISODate(POLICY_UPDATED_ON),
);

/** Outside the (app)/(auth) groups so it opens with or without a session. */
export default function PrivacyPolicyScreen() {
  const colors = useThemeColors();

  return (
    <Screen className="pt-4">
      <ScrollView contentContainerClassName="gap-6 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 font-display text-3xl font-bold text-ink">
            Aviso de privacidad
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={4}
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-line bg-card active:opacity-70"
            style={{ borderRadius: 22 }}
          >
            <Icon ios="xmark" android="close" color={colors.ink} />
          </Pressable>
        </View>

        <Text className="text-base text-ink-muted">{PRIVACY_POLICY_INTRO}</Text>

        {PRIVACY_POLICY.map((section) => (
          <View key={section.title} className="gap-2">
            <Text className="text-lg font-bold text-ink">{section.title}</Text>
            {section.paragraphs?.map((p) => (
              <Text key={p} className="text-sm leading-5 text-ink">
                {p}
              </Text>
            ))}
            {section.items?.map((item) => (
              <View key={item} className="flex-row gap-2">
                <Text className="text-sm leading-5 text-ink-muted">•</Text>
                <Text className="flex-1 text-sm leading-5 text-ink">{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View className="gap-3 rounded-card border border-line bg-card p-4">
          <Text className="text-sm text-ink-muted">¿Dudas sobre tu privacidad?</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Privacidad%20Kinetik`)}
            className="active:opacity-60"
          >
            <Text className="text-base font-semibold text-accent-ink">{CONTACT_EMAIL}</Text>
          </Pressable>
        </View>

        <Text className="text-center text-xs text-ink-muted">
          Última actualización: {updatedOn}
        </Text>
      </ScrollView>
    </Screen>
  );
}
