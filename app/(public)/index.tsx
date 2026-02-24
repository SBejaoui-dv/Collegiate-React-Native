import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';

const featureTabs = [
  {
    key: 'applications',
    title: 'Application Management',
    description: 'Track deadlines and required documents in one place.',
  },
  {
    key: 'essays',
    title: 'Essay Generation',
    description: 'Draft and improve personal statements with guided prompts.',
  },
  {
    key: 'assistant',
    title: 'AI Assistant',
    description: 'Get instant answers for application and college questions.',
  },
] as const;

export default function LandingScreen() {
  const [activeTab, setActiveTab] = useState<(typeof featureTabs)[number]['key']>('applications');

  useEffect(() => {
    const ids = featureTabs.map((tab) => tab.key);
    const interval = setInterval(() => {
      setActiveTab((previous) => {
        const nextIndex = (ids.indexOf(previous) + 1) % ids.length;
        return ids[nextIndex];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const activeFeature = useMemo(
    () => featureTabs.find((tab) => tab.key === activeTab) ?? featureTabs[0],
    [activeTab],
  );

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Collegiate</Text>
        <Text style={styles.title}>Simplify College Applications</Text>
        <Text style={styles.subtitle}>
          Explore schools, organize deadlines, and get writing support in one app.
        </Text>

        <View style={styles.ctaRow}>
          <Link href="/(auth)/signup" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Login</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.tabHeader}>
        {featureTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>{activeFeature.title}</Text>
        <Text style={styles.featureDescription}>{activeFeature.description}</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <Text style={styles.gridTitle}>College Research</Text>
          <Text style={styles.gridBody}>Browse schools and compare opportunities.</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridTitle}>Essay Help</Text>
          <Text style={styles.gridBody}>Build strong drafts and improve your narrative.</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.gridTitle}>Deadline Tracking</Text>
          <Text style={styles.gridBody}>Keep applications on schedule with reminders.</Text>
        </View>
      </View>

      <Link href="/financial-aid" asChild>
        <Pressable style={styles.banner}>
          <Text style={styles.bannerTitle}>Financial Aid</Text>
          <Text style={styles.bannerBody}>Explore scholarships and aid planning resources.</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  ctaRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  tabHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabButtonText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  featureDescription: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 21,
  },
  grid: {
    gap: 10,
  },
  gridCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 5,
  },
  gridTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  gridBody: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  banner: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  bannerTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  bannerBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
