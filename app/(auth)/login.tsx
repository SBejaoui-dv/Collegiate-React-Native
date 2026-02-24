import { router } from 'expo-router';
import { useState } from 'react';

import { AuthField, AuthScaffold } from '@/components/auth/AuthForm';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      router.replace('/(protected)/(tabs)/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Login"
      subtitle="Welcome back. Sign in to continue your college planning."
      primaryActionLabel="Sign In"
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onPrimaryAction={handleSubmit}
      footerLinks={[
        { href: '/(auth)/forgot-password', label: 'Forgot Password' },
        { href: '/(auth)/signup', label: 'Create Student Account' },
        { href: '/(auth)/signup-counselor', label: 'Create Counselor Account' },
      ]}
    >
      <AuthField
        label="Email"
        placeholder="student@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <AuthField
        label="Password"
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
    </AuthScaffold>
  );
}
