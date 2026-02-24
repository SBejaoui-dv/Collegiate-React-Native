import { router } from 'expo-router';
import { useState } from 'react';

import { AuthField, AuthScaffold } from '@/components/auth/AuthForm';
import { useAuth } from '@/app/features/auth/store/auth.context';

export default function ResetPasswordScreen() {
  const { resetPassword } = useAuth();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token: code, newPassword });
      setSuccessMessage('Password updated. Redirecting to login...');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Reset Password"
      subtitle="Use your reset token and set a new password."
      primaryActionLabel="Update Password"
      onPrimaryAction={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      successMessage={successMessage}
      footerLinks={[{ href: '/(auth)/login', label: 'Back to Login' }]}
    >
      <AuthField
        label="Reset Token"
        placeholder="Enter token"
        value={code}
        onChangeText={setCode}
      />
      <AuthField
        label="New Password"
        placeholder="Enter new password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <AuthField
        label="Confirm New Password"
        placeholder="Re-enter new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
    </AuthScaffold>
  );
}
