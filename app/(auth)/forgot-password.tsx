import { useState } from 'react';

import { AuthField, AuthScaffold } from '@/components/auth/AuthForm';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      setSuccessMessage('If this account exists, a reset link has been sent.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Forgot Password"
      subtitle="Enter your account email to receive a reset link."
      primaryActionLabel="Send Reset Link"
      onPrimaryAction={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      successMessage={successMessage}
      footerLinks={[
        { href: '/(auth)/reset-password', label: 'Already have a reset token?' },
        { href: '/(auth)/login', label: 'Back to Login' },
      ]}
    >
      <AuthField
        label="Email"
        placeholder="student@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
    </AuthScaffold>
  );
}
