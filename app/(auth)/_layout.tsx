import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/app/features/auth/store/auth.context';

export default function AuthLayout() {
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (user) {
    return <Redirect href="/(protected)/(tabs)/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="signup-counselor" options={{ title: 'Counselor Sign Up' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
