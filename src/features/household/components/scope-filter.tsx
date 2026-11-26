import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/accounts/api';
import { useScopeStore } from '@/stores/scope-store';

import { usePartner } from '../api';
import type { Scope } from '../scope';

const OPTIONS: { value: Scope; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'personal', label: 'Personal' },
  { value: 'shared', label: 'Compartido' },
];

/** Whether there's anything shared to tell apart (a partner or a shared account). */
function useHasSharedData() {
  const { partner } = usePartner();
  const accounts = useAccounts();
  return !!partner || (accounts.data ?? []).some((a) => a.household_id !== null);
}

/** Personal / shared view in effect: always "all" when nothing is shared. */
export function useScope(): Scope {
  const scope = useScopeStore((s) => s.scope);
  return useHasSharedData() ? scope : 'all';
}

/** "Todo · Personal · Compartido" chips; hidden when nothing is shared. */
export function ScopeFilter() {
  const scope = useScope();
  const setScope = useScopeStore((s) => s.setScope);
  const visible = useHasSharedData();
  if (!visible) return null;

  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-2">
      {OPTIONS.map((o) => {
        const selected = o.value === scope;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setScope(o.value)}
            className={`h-9 justify-center rounded-full px-4 active:opacity-70 ${
              selected ? 'bg-ink' : 'bg-sunken'
            }`}
          >
            <Text className={`text-sm font-semibold ${selected ? 'text-surface' : 'text-ink'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
