import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { Screen } from '@/components/ui/Screen';

type QuickLink = {
  href: '/(public)' | '/(auth)/login' | '/(auth)/signup' | '/(protected)/(tabs)/dashboard' | '/(protected)/(tabs)/search' | '/(protected)/(tabs)/tasks' | '/(protected)/(tabs)/essay-guidance' | '/(protected)/(tabs)/resume-guidance' | '/(protected)/profile' | '/(protected)/counselor-dashboard' | '/financial-aid';
  label: string;
};

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  description?: string;
  links?: QuickLink[];
};

export function PlaceholderScreen({
  title,
  subtitle,
  description,
  links = [],
}: PlaceholderScreenProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      {links.length > 0 ? (
        <View style={styles.linkGrid}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} style={styles.linkCard}>
              {link.label}
            </Link>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
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
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.mutedText,
  },
  linkGrid: {
    gap: 10,
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
});
