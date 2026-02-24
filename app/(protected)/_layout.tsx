import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/app/features/auth/store/auth.context';

export default function ProtectedLayout() {
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="counselor-dashboard" options={{ title: 'Counselor Dashboard' }} />
    </Stack>
  );
}
