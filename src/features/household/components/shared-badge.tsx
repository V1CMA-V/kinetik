import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** Pill for accounts shared with the household; `owner` is set when it belongs to the partner. */
export function SharedBadge({ owner }: { owner: string | null }) {
  return (
    <View className="rounded-full bg-accent-soft px-2 py-0.5">
      <Text numberOfLines={1} className="text-xs font-medium text-accent-ink">
        {owner ? `De ${owner}` : 'Compartida'}
      </Text>
    </View>
  );
}
