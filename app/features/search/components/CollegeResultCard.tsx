import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatMoney,
  formatNumber,
  formatPercent,
} from '@/app/features/search/hooks/useCollegeSearch';
import { listScholarships } from '@/app/features/search/services/scholarship.service';
import {
  getSavedScholarships,
  isScholarshipSaved,
  removeScholarship,
  saveScholarship,
  setSavedScholarships,
} from '@/app/features/search/services/scholarship-storage.service';
import {
  SavedScholarship,
  ScholarshipOpportunity,
  ScholarshipResources,
} from '@/app/features/search/types/scholarship.types';
import { College } from '@/app/features/search/types/search.types';
import { colors } from '@/constants/theme';

type CollegeResultCardProps = {
  college: College;
  isSaved: boolean;
  isPending?: boolean;
  onToggleSave: () => void;
};

export function CollegeResultCard({
  college,
  isSaved,
  isPending = false,
  onToggleSave,
}: CollegeResultCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [savedScholarships, setSavedScholarshipsState] = useState<SavedScholarship[]>([]);
  const [showScholarships, setShowScholarships] = useState(false);
  const [scholarshipLoading, setScholarshipLoading] = useState(false);
  const [scholarshipError, setScholarshipError] = useState<string | null>(null);
  const [scholarships, setScholarships] = useState<ScholarshipOpportunity[]>([]);
  const [scholarshipResources, setScholarshipResources] = useState<ScholarshipResources>({});

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const items = await getSavedScholarships();
      if (!cancelled) {
        setSavedScholarshipsState(items);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const schoolScholarshipPageUrl = useMemo(() => {
    const institutionalScholarship = scholarships.find((item) => item.id === 'institutional-scholarships');
    return scholarshipResources.school_scholarship_page_url || institutionalScholarship?.apply_url || college.website;
  }, [scholarshipResources, scholarships, college.website]);

  const schoolFinancialAidPageUrl =
    scholarshipResources.school_financial_aid_page_url || college.website;
  const showLogo = Boolean(college.logoUrl) && !logoFailed;

  async function syncSavedScholarships(next: SavedScholarship[]) {
    setSavedScholarshipsState(next);
    await setSavedScholarships(next);
  }

  function isItemSaved(item: ScholarshipOpportunity): boolean {
    return isScholarshipSaved(savedScholarships, item, college.name);
  }

  async function toggleSaveScholarship(item: ScholarshipOpportunity) {
    if (isItemSaved(item)) {
      const next = removeScholarship(savedScholarships, item, college.name);
      await syncSavedScholarships(next);
      return;
    }

    const next = saveScholarship(savedScholarships, item, college.name);
    await syncSavedScholarships(next);
  }

  async function removeSavedScholarship(item: SavedScholarship) {
    const next = removeScholarship(savedScholarships, item);
    await syncSavedScholarships(next);
  }

  async function handleOpenScholarships() {
    setShowScholarships(true);

    if (scholarships.length > 0 || scholarshipLoading) {
      return;
    }

    setScholarshipLoading(true);
    setScholarshipError(null);

    try {
      const payload = await listScholarships({
        schoolName: college.name,
        state: college.state,
        schoolUrl: college.website,
      });
      setScholarships(payload.scholarships);
      setScholarshipResources(payload.resources);
    } catch (error) {
      setScholarshipError(error instanceof Error ? error.message : 'Failed to load scholarships.');
    } finally {
      setScholarshipLoading(false);
    }
  }

  async function openUrl(url?: string | null) {
    if (!url) {
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.logoWrap}>
          {showLogo ? (
            <Image
              source={{ uri: college.logoUrl }}
              style={styles.logo}
              contentFit="contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>{getInitials(college.name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{college.name}</Text>
          <Text style={styles.subtitle}>
            {college.city}, {college.state}
          </Text>
        </View>
        {college.onlineOnly ? <Text style={styles.onlineBadge}>Online</Text> : null}
      </View>

      <View style={styles.grid}>
        <Metric label="Acceptance" value={formatPercent(college.acceptanceRate)} />
        <Metric label="Students" value={formatNumber(college.studentSize)} />
        <Metric label="In-State Tuition" value={formatMoney(college.tuitionInState)} />
        <Metric label="Out-State Tuition" value={formatMoney(college.tuitionOutOfState)} />
        <Metric label="SAT (75th)" value={formatNumber(college.sat75th)} />
        <Metric label="ACT (75th)" value={formatNumber(college.act75th)} />
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.saveButton, isSaved && styles.saveButtonActive]}
          onPress={onToggleSave}
          disabled={isPending}
        >
          <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
            {isPending ? 'Saving...' : isSaved ? 'Saved' : 'Add to Dashboard'}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => void handleOpenScholarships()}>
          <Text style={styles.secondaryButtonText}>Scholarships</Text>
        </Pressable>
      </View>

      <Modal
        visible={showScholarships}
        animationType="slide"
        onRequestClose={() => setShowScholarships(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Scholarships</Text>
              <Text style={styles.modalSubtitle}>{college.name}</Text>
            </View>
            <Pressable style={styles.modalCloseButton} onPress={() => setShowScholarships(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {schoolScholarshipPageUrl ? (
              <View style={styles.resourceCard}>
                <Text style={styles.resourceTitle}>School Scholarship Results</Text>
                <Text style={styles.resourceBody}>Find institution-specific scholarship pages.</Text>
                <Pressable style={styles.resourceButton} onPress={() => void openUrl(schoolScholarshipPageUrl)}>
                  <Text style={styles.resourceButtonText}>Open Results</Text>
                </Pressable>
              </View>
            ) : null}

            {schoolFinancialAidPageUrl ? (
              <View style={styles.resourceCard}>
                <Text style={styles.resourceTitle}>School Financial Aid Results</Text>
                <Text style={styles.resourceBody}>Open official financial aid resources for this college.</Text>
                <Pressable style={styles.resourceButton} onPress={() => void openUrl(schoolFinancialAidPageUrl)}>
                  <Text style={styles.resourceButtonText}>Open Aid Resources</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Saved Scholarships</Text>
              {savedScholarships.length === 0 ? (
                <Text style={styles.savedEmptyText}>No saved scholarships yet.</Text>
              ) : (
                savedScholarships.map((item) => (
                  <View key={`${item.collegeName}-${item.id}`} style={styles.savedScholarshipCard}>
                    <View style={styles.savedScholarshipHeader}>
                      <View style={styles.savedScholarshipTextWrap}>
                        <Text style={styles.savedScholarshipName}>{item.name}</Text>
                        <Text style={styles.savedScholarshipMeta}>{item.provider} • {item.collegeName}</Text>
                      </View>
                      <View style={styles.savedScholarshipActions}>
                        <Pressable style={styles.miniButton} onPress={() => void openUrl(item.apply_url)}>
                          <Text style={styles.miniButtonText}>Apply</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.miniButton, styles.miniButtonOutline]}
                          onPress={() => void removeSavedScholarship(item)}
                        >
                          <Text style={[styles.miniButtonText, styles.miniButtonOutlineText]}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {scholarshipLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.body}>Loading scholarships...</Text>
              </View>
            ) : null}

            {scholarshipError ? <Text style={styles.errorText}>{scholarshipError}</Text> : null}

            {!scholarshipLoading && !scholarshipError && scholarships.length === 0 ? (
              <Text style={styles.body}>No scholarships found.</Text>
            ) : null}

            {!scholarshipLoading
              ? scholarships.map((item) => {
                  const saved = isItemSaved(item);
                  return (
                    <View key={item.id} style={styles.scholarshipCard}>
                      <View style={styles.scholarshipHeader}>
                        <View style={styles.scholarshipTextWrap}>
                          <Text style={styles.scholarshipName}>{item.name}</Text>
                          <Text style={styles.scholarshipProvider}>{item.provider}</Text>
                        </View>
                        <View style={styles.scholarshipActions}>
                          <Pressable style={styles.miniButton} onPress={() => void openUrl(item.apply_url)}>
                            <Text style={styles.miniButtonText}>Apply</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.miniButton, saved && styles.miniButtonSaved]}
                            onPress={() => void toggleSaveScholarship(item)}
                          >
                            <Text style={styles.miniButtonText}>{saved ? 'Saved' : 'Save'}</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.body}>{item.description}</Text>
                      <Text style={styles.detailText}>Amount: {item.amount}</Text>
                      <Text style={styles.detailText}>Deadline: {item.deadline}</Text>
                      <Text style={styles.detailText}>Eligibility: {item.eligibility}</Text>
                    </View>
                  );
                })
              : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  logoFallbackText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  titleWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
  },
  onlineBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    width: '48%',
    gap: 2,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonActive: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButtonTextActive: {
    color: '#166534',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleWrap: {
    gap: 2,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.mutedText,
    fontSize: 13,
  },
  modalCloseButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  modalCloseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalContent: {
    padding: 16,
    gap: 10,
  },
  resourceCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: colors.surface,
  },
  resourceTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resourceBody: {
    color: colors.mutedText,
    fontSize: 13,
  },
  resourceButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resourceButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  savedSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  savedTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  savedEmptyText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  savedScholarshipCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  savedScholarshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedScholarshipTextWrap: {
    flex: 1,
    gap: 2,
  },
  savedScholarshipName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  savedScholarshipMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  savedScholarshipActions: {
    flexDirection: 'row',
    gap: 6,
  },
  scholarshipCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: colors.surface,
  },
  scholarshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scholarshipTextWrap: {
    flex: 1,
    gap: 2,
  },
  scholarshipName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  scholarshipProvider: {
    color: colors.mutedText,
    fontSize: 12,
  },
  scholarshipActions: {
    flexDirection: 'row',
    gap: 6,
  },
  miniButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  miniButtonSaved: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  miniButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  miniButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  miniButtonOutlineText: {
    color: colors.text,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  detailText: {
    color: colors.text,
    fontSize: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
});
