import { router } from 'expo-router';

import { Section, SettingsRow } from '@/features/profile/components/settings';
import { useFormatMoney } from '@/hooks/use-format-money';

import { useIncomeProfile } from '../api';
import { describeSchedule, monthlyIncome, PAY_FREQUENCIES } from '../schedule';

/** Profile entry point for the optional income profile. */
export function IncomeSection() {
  const formatAmount = useFormatMoney();
  const { data: profile } = useIncomeProfile();

  return (
    <Section title="Ingresos">
      <SettingsRow
        label="Mis ingresos"
        icon={{ ios: 'banknote', android: 'payments' }}
        description={
          profile
            ? `${PAY_FREQUENCIES[profile.pay_frequency].label} · ${describeSchedule(profile)} · ≈ ${formatAmount(monthlyIncome(profile))} al mes`
            : 'Opcional · Proyecta tus pagos y recibe sugerencias'
        }
        onPress={() => router.push('/profile/income')}
        last
      />
    </Section>
  );
}
