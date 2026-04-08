import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useSubscription } from '@/app/features/subscription/store/subscription.context';

export function TokenDisplay() {
  const { isPremium, tokensRemaining, tokenStatus, isLoading } = useSubscription();

  if (isLoading) {
    return <Text style={styles.loadingText}>Loading...</Text>;
  }

  if (isPremium) {
    return (
      <Pressable style={styles.premiumBadge} onPress={() => router.push('/(protected)/premium')}>
        <Ionicons name="star" size={12} color="#92400E" />
        <Text style={styles.premiumText}>Premium</Text>
      </Pressable>
    );
  }

  const limit = tokenStatus?.tokens_limit ?? 5;
  const remaining = tokensRemaining ?? 0;
  const low = remaining <= 1;

  return (
    <Pressable
      style={[styles.freeBadge, low && styles.freeBadgeLow]}
      onPress={() => router.push('/(protected)/premium')}
    >
      <Ionicons name="flash" size={12} color={low ? '#B91C1C' : '#92400E'} />
      <Text style={[styles.freeText, low && styles.freeTextLow]}>
        {remaining}/{limit}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  premiumBadge: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#FDE68A',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  freeBadge: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freeBadgeLow: {
    backgroundColor: '#FEE2E2',
  },
  freeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  freeTextLow: {
    color: '#B91C1C',
  },
});
