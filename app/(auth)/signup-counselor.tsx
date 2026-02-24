import { router } from 'expo-router';
import { useState } from 'react';

import { AuthField, AuthScaffold } from '@/components/auth/AuthForm';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function SignupCounselorScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!fullName.trim() || !schoolName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        fullName,
        schoolName,
        email,
        password,
        role: 'counselor',
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
      title="Counselor Sign Up"
      subtitle="Create a counselor workspace for guiding students."
      primaryActionLabel="Create Counselor Account"
      onPrimaryAction={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      footerLinks={[{ href: '/(auth)/login', label: 'Already have an account? Login' }]}
    >
      <AuthField
        label="Full Name"
        placeholder="Alex Taylor"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <AuthField
        label="School or Organization"
        placeholder="Riverside High School"
        value={schoolName}
        onChangeText={setSchoolName}
        autoCapitalize="words"
      />
      <AuthField
        label="Email"
        placeholder="counselor@school.edu"
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
    </AuthScaffold>
  );
}
