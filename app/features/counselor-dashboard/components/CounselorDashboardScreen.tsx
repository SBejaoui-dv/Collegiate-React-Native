import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/app/features/auth/store/auth.context';
import {
  buildDashboardStats,
  fetchCounselorChecklists,
  fetchCounselorDocuments,
  fetchCounselorStudents,
  fetchCounselorTasks,
} from '@/app/features/counselor-dashboard/services/counselor-dashboard.service';
import {
  Checklist,
  CounselorTabKey,
  Document,
  Student,
  StudentTask,
} from '@/app/features/counselor-dashboard/types/counselor-dashboard.types';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

type TabConfig = {
  key: CounselorTabKey;
  label: string;
  badge?: number;
};

type CounselorDashboardScreenProps = {
  initialTab?: CounselorTabKey;
  showInlineTabs?: boolean;
};

export default function CounselorDashboardScreen({
  initialTab = 'overview',
  showInlineTabs = false,
}: CounselorDashboardScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CounselorTabKey>(initialTab);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [studentsData, tasksData, checklistData, documentData] = await Promise.all([
        fetchCounselorStudents(),
        fetchCounselorTasks(),
        fetchCounselorChecklists(),
        fetchCounselorDocuments(),
      ]);
      setStudents(studentsData);
      setTasks(tasksData);
      setChecklists(checklistData);
      setDocuments(documentData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load counselor dashboard.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveTab(initialTab);
      void loadDashboard();
    }, [initialTab, loadDashboard]),
  );

  const stats = useMemo(() => buildDashboardStats(students, tasks), [students, tasks]);

  const tabs: TabConfig[] = useMemo(
    () => [
      {
        key: 'overview',
        label: 'Overview',
        badge: stats.overdueCount + stats.highRiskCount || undefined,
      },
      { key: 'students', label: 'Students', badge: stats.totalStudents || undefined },
      { key: 'checklists', label: 'Checklists' },
      { key: 'documents', label: 'Documents', badge: documents.length || undefined },
      { key: 'invites', label: 'Invite Codes' },
    ],
    [documents.length, stats.highRiskCount, stats.overdueCount, stats.totalStudents],
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (task.completed || !task.deadline) {
          return false;
        }
        return new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
      }),
    [tasks],
  );

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="Total Students" value={String(stats.totalStudents)} />
            <StatCard label="In Progress" value={String(stats.inProgress)} />
            <StatCard label="Submitted" value={String(stats.submitted)} />
            <StatCard label="Overdue Tasks" value={String(stats.overdueCount)} alert />
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.sectionTitle}>At-Risk Students</Text>
            {stats.highRiskCount === 0 ? (
              <Text style={styles.bodyText}>No high-risk students right now.</Text>
            ) : (
              <Text style={styles.bodyText}>
                {stats.highRiskCount} student{stats.highRiskCount === 1 ? '' : 's'} need immediate follow-up.
              </Text>
            )}
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            {overdueTasks.length === 0 ? (
              <Text style={styles.bodyText}>No overdue tasks.</Text>
            ) : (
              overdueTasks.slice(0, 5).map((task) => (
                <View key={task.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{task.title || 'Untitled Task'}</Text>
                  <Text style={styles.listMeta}>Past due: {formatDate(task.deadline)}</Text>
                </View>
              ))
            )}
          </View>
        </>
      );
    }

    if (activeTab === 'students') {
      return (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Student Progress</Text>
          {students.length === 0 ? (
            <Text style={styles.bodyText}>No assigned students found.</Text>
          ) : (
            students.map((student) => (
              <View key={student.id} style={styles.listRow}>
                <Text style={styles.listTitle}>{student.name}</Text>
                <Text style={styles.listMeta}>
                  {student.grade} | {student.applicationStatus} | Essays {student.essaysCompleted}/{student.totalEssays}
                </Text>
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeTab === 'checklists') {
      return (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Milestone Checklists</Text>
          {checklists.length === 0 ? (
            <Text style={styles.bodyText}>No checklists created yet.</Text>
          ) : (
            checklists.map((checklist) => (
              <View key={checklist.id} style={styles.listRow}>
                <Text style={styles.listTitle}>{checklist.title}</Text>
                <Text style={styles.listMeta}>
                  {checklist.description || 'No description'} | Assigned: {checklist.assignedStudents}
                </Text>
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeTab === 'documents') {
      return (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Document Library</Text>
          {documents.length === 0 ? (
            <Text style={styles.bodyText}>No documents uploaded yet.</Text>
          ) : (
            documents.map((document) => (
              <View key={document.id} style={styles.listRow}>
                <Text style={styles.listTitle}>{document.title}</Text>
                <Text style={styles.listMeta}>
                  {document.category} | {document.fileType} | {formatDate(document.uploadedAt)}
                </Text>
              </View>
            ))
          )}
        </View>
      );
    }

    return (
      <View style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Invite Codes</Text>
        <Text style={styles.bodyText}>Manage and share counselor invite codes here.</Text>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Counselor Dashboard</Text>
          <Pressable style={styles.outlineButton} onPress={() => void loadDashboard()}>
            <Text style={styles.outlineButtonText}>Refresh</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Welcome back, {user?.fullName ?? 'Counselor'}.</Text>
      </View>

      {showInlineTabs ? (
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                {tab.badge ? (
                  <View style={[styles.badge, tab.key === 'overview' ? styles.alertBadge : styles.infoBadge]}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.bodyText}>Loading counselor dashboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void loadDashboard()}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        renderTabContent()
      )}

      {activeTab === 'overview' ? (
        <>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/(protected)/(counselor-tabs)/students')}
            >
              <Text style={styles.actionButtonText}>Manage Students</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/(protected)/(counselor-tabs)/checklists')}
            >
              <Text style={styles.actionButtonText}>Checklists</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/(protected)/(counselor-tabs)/documents')}
            >
              <Text style={styles.actionButtonText}>Documents</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/(protected)/(counselor-tabs)/invites')}
            >
              <Text style={styles.actionButtonText}>Invite Codes</Text>
            </Pressable>
          </View>
        </>
      ) : null}

    </Screen>
  );
}

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <View style={[styles.statCard, alert && styles.alertStatCard]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatDate(value: string) {
  if (!value) {
    return 'Unknown date';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tabText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  badge: {
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  alertBadge: {
    backgroundColor: '#FEE2E2',
  },
  infoBadge: {
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  stateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EFF6FF',
    padding: 12,
    gap: 2,
  },
  alertStatCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  contentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
  },
  listRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 2,
    backgroundColor: '#F8FAFC',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  listMeta: {
    fontSize: 12,
    color: colors.mutedText,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  outlineWideButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '700',
  },
  outlineButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
