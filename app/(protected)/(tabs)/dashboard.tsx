import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/app/features/auth/store/auth.context';
import {
  listDashboardColleges,
  removeCollegeFromDashboard,
} from '@/app/features/dashboard/services/dashboard.service';
import { getSavedScholarships } from '@/app/features/search/services/scholarship-storage.service';
import type { SavedCollege } from '@/app/features/dashboard/services/dashboard.service';
import { getPendingTasksCount } from '@/app/features/tasks/services/task.service';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [savedColleges, setSavedColleges] = useState<SavedCollege[]>([]);
  const [savedScholarshipsCount, setSavedScholarshipsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [colleges, tasksCount] = await Promise.all([
        listDashboardColleges(),
        getPendingTasksCount(),
      ]);
      const scholarships = await getSavedScholarships();
      setSavedColleges(colleges);
      setPendingTasksCount(tasksCount);
      setSavedScholarshipsCount(scholarships.length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData]),
  );

  const filteredColleges = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) {
      return savedColleges;
    }

    return savedColleges.filter((college) =>
      [college.college_name, college.city, college.state]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [savedColleges, searchFilter]);

  const removeCollege = async (collegeId: string) => {
    setPendingDeleteId(collegeId);
    setError(null);
    try {
      await removeCollegeFromDashboard(collegeId);
      await loadDashboardData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to remove college.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <Screen>
      <View style={styles.heroCard}>
        <Text style={styles.title}>My Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.fullName ?? 'Student'}.</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statLabel}>Saved Colleges</Text>
          <Text style={styles.statValue}>{savedColleges.length}</Text>
          <Text style={styles.statHint}>Schools on your list</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSecondary]}>
          <Text style={styles.statLabel}>Pending Tasks</Text>
          <Text style={styles.statValue}>{pendingTasksCount}</Text>
          <Text style={styles.statHint}>Open the Tasks tab to manage</Text>
        </View>
        <View style={[styles.statCard, styles.statCardTertiary]}>
          <Text style={styles.statLabel}>Saved Scholarships</Text>
          <Text style={styles.statValue}>{savedScholarshipsCount}</Text>
          <Text style={styles.statHint}>Ready-to-apply opportunities</Text>
        </View>
      </View>

      <View style={styles.tasksCard}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        <Text style={styles.body}>Track deadlines and checklist items in the Tasks tab.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(protected)/(tabs)/tasks')}>
          <Text style={styles.secondaryButtonText}>Open Tasks</Text>
        </Pressable>
      </View>

      <View style={styles.savedCard}>
        <Text style={styles.sectionTitle}>My Saved Colleges</Text>
        <TextInput
          style={styles.input}
          placeholder="Filter colleges..."
          placeholderTextColor="#94A3B8"
          value={searchFilter}
          onChangeText={setSearchFilter}
        />

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.body}>Loading your colleges...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => void loadDashboardData()}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : savedColleges.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.emptyTitle}>No Colleges Saved Yet</Text>
            <Text style={styles.body}>Explore colleges and save your favorites to track them here.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(protected)/(tabs)/search')}>
              <Text style={styles.primaryButtonText}>Explore Colleges</Text>
            </Pressable>
          </View>
        ) : filteredColleges.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.body}>Try adjusting your filter terms.</Text>
          </View>
        ) : (
          filteredColleges.map((college) => (
            <View key={college.id} style={styles.collegeCard}>
              <Text style={styles.collegeName}>{college.college_name}</Text>
              <Text style={styles.collegeMeta}>
                {college.city ? `${college.city}, ` : ''}
                {college.state ?? ''}
              </Text>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Acceptance:</Text>
                <Text style={styles.metricValue}>{formatPercent(college.admission_rate)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Students:</Text>
                <Text style={styles.metricValue}>{formatNumber(college.student_size)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>In-State Tuition:</Text>
                <Text style={styles.metricValue}>{formatMoney(college.tuition_in_state)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Out-State Tuition:</Text>
                <Text style={styles.metricValue}>{formatMoney(college.tuition_out_of_state)}</Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => void removeCollege(college.id)}
                disabled={pendingDeleteId === college.id}
              >
                <Text style={styles.removeButtonText}>
                  {pendingDeleteId === college.id ? 'Removing...' : 'Remove'}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.settingsButton} onPress={() => router.push('/(protected)/settings')}>
        <Text style={styles.settingsButtonText}>Open Settings</Text>
      </Pressable>

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
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  statCardPrimary: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statCardSecondary: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statCardTertiary: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  statHint: {
    color: colors.mutedText,
    fontSize: 12,
  },
  tasksCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  savedCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
    fontSize: 14,
  },
  collegeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  collegeName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  collegeMeta: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 13,
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  removeButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
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
  settingsButton: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  signOutText: {
    color: colors.text,
    fontWeight: '700',
  },
});

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return value.toLocaleString();
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `$${Math.round(value).toLocaleString()}`;
}
