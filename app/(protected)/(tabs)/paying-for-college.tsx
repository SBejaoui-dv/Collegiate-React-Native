import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';
import {
  getSavedScholarships,
  removeScholarship,
  setSavedScholarships,
} from '@/app/features/search/services/scholarship-storage.service';
import { SavedScholarship } from '@/app/features/search/types/scholarship.types';

const GRANT_RESOURCES = [
  {
    title: 'FAFSA Application',
    description: 'Start here to unlock federal, state, and school aid.',
    url: 'https://studentaid.gov/h/apply-for-aid/fafsa',
  },
  {
    title: 'Federal Pell Grant',
    description: 'Need-based grant for undergraduate students.',
    url: 'https://studentaid.gov/understand-aid/types/grants/pell',
  },
  {
    title: 'State Financial Aid Directory',
    description: 'Find state grant agencies and scholarship portals.',
    url: 'https://www2.ed.gov/about/contacts/state/index.html',
  },
];

const LOAN_TIPS = [
  'Borrow only what you need after grants/scholarships are applied.',
  'Prefer federal subsidized and unsubsidized loans before private loans.',
  'Track rates, grace periods, and repayment plans before accepting.',
  'Use a monthly budget to estimate post-graduation payment affordability.',
  'Reapply for FAFSA every year to keep aid options open.',
];

export default function PayingForCollegeScreen() {
  const [savedScholarships, setSavedScholarshipsState] = useState<SavedScholarship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSavedScholarships = useCallback(async () => {
    const items = await getSavedScholarships();
    setSavedScholarshipsState(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedScholarships();
    }, [loadSavedScholarships]),
  );

  const filteredScholarships = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return savedScholarships;
    }

    return savedScholarships.filter((item) =>
      [item.name, item.provider, item.collegeName, item.description]
        .map((value) => value.toLowerCase())
        .some((value) => value.includes(query)),
    );
  }, [savedScholarships, searchTerm]);

  async function openUrl(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }

  async function handleRemove(item: SavedScholarship) {
    const next = removeScholarship(savedScholarships, item);
    setSavedScholarshipsState(next);
    await setSavedScholarships(next);
  }

  return (
    <Screen>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Paying for College</Text>
        <Text style={styles.subtitle}>
          Start with grants and scholarships, then fill any remaining gap with smart borrowing.
        </Text>
      </View>

      <View style={styles.stepsRow}>
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>1. Save Opportunities</Text>
          <Text style={styles.stepBody}>Open Search cards and save scholarships you qualify for.</Text>
        </View>
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>2. Apply to Grants First</Text>
          <Text style={styles.stepBody}>Submit FAFSA/state aid early to maximize eligibility.</Text>
        </View>
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>3. Plan Borrowing</Text>
          <Text style={styles.stepBody}>Borrow only what remains after aid and scholarships.</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Saved Scholarships</Text>
          <Text style={styles.statValue}>{savedScholarships.length}</Text>
          <Text style={styles.statHint}>Ready-to-apply opportunities</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Grant Resources</Text>
          <Text style={styles.statValue}>{GRANT_RESOURCES.length}</Text>
          <Text style={styles.statHint}>Federal + state starting points</Text>
        </View>
      </View>

      <View style={styles.blockCard}>
        <Text style={styles.sectionTitle}>Recommended Timeline</Text>
        <Text style={styles.timelineText}>Fall: Gather docs, start FAFSA profile, and build your list.</Text>
        <Text style={styles.timelineText}>Spring: Submit aid forms and compare net costs by school.</Text>
        <Text style={styles.timelineText}>Summer: Accept grants/scholarships first, then loans if needed.</Text>
      </View>

      <View style={styles.blockCard}>
        <Text style={styles.sectionTitle}>Grants and Aid Resources</Text>
        {GRANT_RESOURCES.map((resource) => (
          <View key={resource.title} style={styles.resourceItem}>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            <Text style={styles.resourceBody}>{resource.description}</Text>
            <Pressable style={styles.resourceButton} onPress={() => void openUrl(resource.url)}>
              <Text style={styles.resourceButtonText}>Open</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.blockCard}>
        <Text style={styles.sectionTitle}>Smart Loan Tips</Text>
        {LOAN_TIPS.map((tip) => (
          <View key={tip} style={styles.tipItem}>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
        <Pressable
          style={styles.primaryButton}
          onPress={() => void openUrl('https://studentaid.gov/understand-aid/types/loans')}
        >
          <Text style={styles.primaryButtonText}>Learn About Federal Loans</Text>
        </Pressable>
      </View>

      <View style={styles.blockCard}>
        <Text style={styles.sectionTitle}>Saved Scholarships</Text>
        <TextInput
          style={styles.input}
          placeholder="Filter scholarships..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {savedScholarships.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.emptyTitle}>No Saved Scholarships Yet</Text>
            <Text style={styles.body}>Open a college card in Search and save scholarships first.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(protected)/(tabs)/search')}>
              <Text style={styles.primaryButtonText}>Explore Colleges</Text>
            </Pressable>
          </View>
        ) : filteredScholarships.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.body}>Try a different search term.</Text>
          </View>
        ) : (
          filteredScholarships.map((item) => (
            <View key={`${item.collegeName}-${item.id}`} style={styles.scholarshipCard}>
              <Text style={styles.scholarshipName}>{item.name}</Text>
              <Text style={styles.scholarshipMeta}>{item.provider}</Text>
              <Text style={styles.scholarshipMeta}>{item.collegeName}</Text>
              <Text style={styles.body}>{item.description}</Text>
              <Text style={styles.detailText}>Amount: {item.amount}</Text>
              <Text style={styles.detailText}>Deadline: {item.deadline}</Text>
              <Text style={styles.detailText}>Eligibility: {item.eligibility}</Text>
              <View style={styles.scholarshipActions}>
                <Pressable style={styles.primaryButton} onPress={() => void openUrl(item.apply_url)}>
                  <Text style={styles.primaryButtonText}>Apply</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void handleRemove(item)}>
                  <Text style={styles.secondaryButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#E8F0FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedText,
  },
  stepsRow: {
    gap: 8,
  },
  stepCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stepBody: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    color: colors.mutedText,
    fontSize: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statHint: {
    color: colors.mutedText,
    fontSize: 12,
  },
  blockCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  timelineText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  resourceItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 6,
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
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resourceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tipItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  tipText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  stateWrap: {
    gap: 8,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  scholarshipCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  scholarshipName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  scholarshipMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  detailText: {
    color: colors.text,
    fontSize: 12,
  },
  scholarshipActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
