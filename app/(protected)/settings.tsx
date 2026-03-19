import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { forgotPassword } from '@/app/features/auth/services/auth.service';
import { useAuth } from '@/app/features/auth/store/auth.context';
import {
  requestAccountDeletion,
  updateUserEmail,
} from '@/app/features/settings/services/settings.service';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteRequested, setDeleteRequested] = useState(false);

  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveEmail = async () => {
    try {
      setIsSavingEmail(true);
      await updateUserEmail(newEmail);
      setEmailSaved(true);
      setNewEmail('');
      setTimeout(() => setEmailSaved(false), 2500);
    } catch (error) {
      Alert.alert('Email update failed', error instanceof Error ? error.message : 'Unable to update email.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      Alert.alert('Password reset failed', 'No account email found.');
      return;
    }

    try {
      setIsSendingReset(true);
      await forgotPassword({ email: user.email });
      setPasswordSent(true);
      setTimeout(() => setPasswordSent(false), 3000);
    } catch (error) {
      Alert.alert(
        'Password reset failed',
        error instanceof Error ? error.message : 'Unable to send reset link.',
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResetDefaults = () => {
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      Alert.alert('Delete request failed', 'No user session found.');
      return;
    }

    try {
      setIsDeleting(true);
      await requestAccountDeletion(user.id);
      setDeleteRequested(true);
      signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Delete request failed', error instanceof Error ? error.message : 'Unable to submit request.');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = deleteConfirm.trim().toUpperCase() === 'DELETE';

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.push('/(protected)/(tabs)/dashboard')}>
        <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="settings-outline" size={20} color="#7C3AED" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Account Settings</Text>
            <Text style={styles.heroSubtitle}>Manage your security, account details, and preferences.</Text>
          </View>
        </View>
        <View style={styles.pillsRow}>
          <StatPill label="Email" value="Verified" />
          <StatPill label="Password" value="Protected" />
          <StatPill label="Account" value="Active" />
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionBlue]}>
        <SectionTitle icon="mail-outline" label="Email" />
        <Text style={styles.sectionDescription}>Update the email associated with your account.</Text>
        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="name@example.com"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.actionButton, (!newEmail.trim() || isSavingEmail) && styles.actionButtonDisabled]}
          onPress={() => void handleSaveEmail()}
          disabled={!newEmail.trim() || isSavingEmail}
        >
          <Text style={styles.actionButtonText}>{isSavingEmail ? 'Saving...' : 'Save Email'}</Text>
        </Pressable>
        {emailSaved ? <Text style={styles.successText}>Email update saved.</Text> : null}
      </View>

      <View style={[styles.sectionCard, styles.sectionPurple]}>
        <SectionTitle icon="lock-closed-outline" label="Password" />
        <Text style={styles.sectionDescription}>Reset your password to keep your account secure.</Text>
        <Pressable
          style={[styles.secondaryButton, isSendingReset && styles.actionButtonDisabled]}
          onPress={() => void handleSendPasswordReset()}
          disabled={isSendingReset}
        >
          <Text style={styles.secondaryButtonText}>
            {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
          </Text>
        </Pressable>
        {passwordSent ? <Text style={styles.successText}>Password reset email sent.</Text> : null}
      </View>

      <View style={[styles.sectionCard, styles.sectionGreen]}>
        <SectionTitle icon="refresh-outline" label="Preferences" />
        <Text style={styles.sectionDescription}>Restore your preferences to the default configuration.</Text>
        <Pressable style={styles.secondaryButton} onPress={handleResetDefaults}>
          <Text style={styles.secondaryButtonText}>Reset to Defaults</Text>
        </Pressable>
        {resetDone ? <Text style={styles.successText}>Preferences reset successfully.</Text> : null}
      </View>

      <View style={[styles.sectionCard, styles.sectionRed]}>
        <SectionTitle icon="trash-outline" label="Delete Account" />
        <Text style={styles.sectionDescription}>Permanently delete your account and associated data.</Text>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={16} color="#B91C1C" />
          <Text style={styles.warningText}>This action is permanent and cannot be undone.</Text>
        </View>
        <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
        <TextInput
          style={styles.input}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          placeholder="DELETE"
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
        />
        <Pressable
          style={[styles.deleteButton, (!canDelete || isDeleting) && styles.actionButtonDisabled]}
          onPress={() => void handleDeleteAccount()}
          disabled={!canDelete || isDeleting}
        >
          <Text style={styles.deleteButtonText}>{isDeleting ? 'Submitting...' : 'Delete Account'}</Text>
        </Pressable>
        {deleteRequested ? <Text style={styles.successText}>Request submitted.</Text> : null}
      </View>
    </Screen>
  );
}

function SectionTitle({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  statPillLabel: {
    fontSize: 11,
    color: colors.mutedText,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statPillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    backgroundColor: colors.surface,
  },
  sectionBlue: {
    borderColor: '#BFDBFE',
  },
  sectionPurple: {
    borderColor: '#DDD6FE',
  },
  sectionGreen: {
    borderColor: '#BBF7D0',
  },
  sectionRed: {
    borderColor: '#FECACA',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#312E81',
    fontSize: 14,
    fontWeight: '700',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
  },
  deleteButton: {
    borderRadius: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 11,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
});
