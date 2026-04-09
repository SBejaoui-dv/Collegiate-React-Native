import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/app/features/auth/store/auth.context';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function CounselorSettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Counselor Settings</Text>
        <Text style={styles.subtitle}>{user?.fullName ?? 'Counselor'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.sectionBody}>Role: Counselor</Text>
        <Text style={styles.sectionBody}>Email: {user?.email ?? 'Unknown'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionBody}>Email alerts and reminders will be configured here.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.sectionBody}>Data access and export controls will be available here.</Text>
      </View>

      <Pressable
        style={styles.signOutButton}
        onPress={() => {
          signOut();
          router.replace('/(auth)/login');
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    color: colors.mutedText,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  signOutText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
});
