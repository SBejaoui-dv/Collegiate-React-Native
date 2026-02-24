import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/app/features/auth/store/auth.context';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Student Dashboard</Text>
        <Text style={styles.subtitle}>Signed in as {user?.fullName ?? 'User'}</Text>
        <Text style={styles.body}>
          Protected area scaffold. Next we can migrate dashboard widgets and live data blocks.
        </Text>
      </View>

      <Link href="/(protected)/profile" style={styles.linkCard}>
        Profile
      </Link>
      <Link href="/(protected)/counselor-dashboard" style={styles.linkCard}>
        Counselor Dashboard
      </Link>

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
    padding: 18,
    gap: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
  },
  linkCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.text,
    fontWeight: '700',
  },
});
