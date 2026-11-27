import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="password" options={{ presentation: 'modal' }} />
      <Stack.Screen name="income" options={{ presentation: 'modal' }} />
      <Stack.Screen name="archived-accounts" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="join" options={{ presentation: 'modal' }} />
      <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
