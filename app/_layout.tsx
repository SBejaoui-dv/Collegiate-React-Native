import { Stack } from 'expo-router';

import { AuthProvider } from '@/app/features/auth/store/auth.context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        <Stack.Screen
          name="financial-aid"
          options={{
            title: 'Financial Aid',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
