import { Stack } from 'expo-router';

export default function TransactionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="new-subscription" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
