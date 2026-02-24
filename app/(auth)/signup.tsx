import { router } from 'expo-router';
import { useState } from 'react';

import { AuthField, AuthScaffold } from '@/components/auth/AuthForm';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        fullName,
        email,
        password,
        role: 'student',
      });
      router.replace('/(protected)/(tabs)/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Student Sign Up"
      subtitle="Create your student account to start tracking applications."
      primaryActionLabel="Create Student Account"
      onPrimaryAction={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      footerLinks={[{ href: '/(auth)/login', label: 'Already have an account? Login' }]}
    >
      <AuthField
        label="Full Name"
        placeholder="Jamie Smith"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <AuthField
        label="Email"
        placeholder="student@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <AuthField
        label="Password"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <AuthField
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
    </AuthScaffold>
  );
}
