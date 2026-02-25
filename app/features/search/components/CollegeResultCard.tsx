import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatMoney,
  formatNumber,
  formatPercent,
} from '@/app/features/search/hooks/useCollegeSearch';
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
  const showLogo = Boolean(college.logoUrl) && !logoFailed;

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
        <Link href="/financial-aid" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Financial Aid</Text>
          </Pressable>
        </Link>
        {college.website ? (
          <Text style={styles.websiteText}>{college.website}</Text>
        ) : (
          <Text style={styles.websiteText}>No website</Text>
        )}
      </View>
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
    alignItems: 'flex-start',
    gap: 10,
  },
  saveButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  websiteText: {
    flex: 1,
    textAlign: 'right',
    color: colors.mutedText,
    fontSize: 12,
  },
});
