import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/theme';
import { useSubscription } from '@/app/features/subscription/store/subscription.context';

const FREE_FEATURES = [
  '5 AI tokens per day',
  'College search and filters',
  'Save colleges to dashboard',
  'Task management',
];

const PREMIUM_FEATURES = [
  'Unlimited AI tokens',
  'Essay grading and feedback',
  'Resume review and guidance',
  'Priority support',
];

export default function PremiumScreen() {
  const { isLoading, isPremium, tokenStatus, subscriptionStatus, tokensRemaining, refresh, startCheckout, manageSubscription } =
    useSubscription();
  const [isLaunchingCheckout, setIsLaunchingCheckout] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const renewalLabel = useMemo(() => {
    const periodEnd = subscriptionStatus?.current_period_end;
    if (!periodEnd) {
      return null;
    }
    const date = new Date(periodEnd);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [subscriptionStatus?.current_period_end]);

  const remainingLabel =
    tokensRemaining === null || tokensRemaining === undefined ? '—' : String(tokensRemaining);
  const limitLabel = tokenStatus?.tokens_limit === null || tokenStatus?.tokens_limit === undefined
    ? '5'
    : String(tokenStatus.tokens_limit);

  const handleStartCheckout = async () => {
    try {
      setIsLaunchingCheckout(true);
      await startCheckout();
    } catch (error) {
      Alert.alert('Checkout error', error instanceof Error ? error.message : 'Failed to open checkout.');
    } finally {
      setIsLaunchingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsOpeningPortal(true);
      await manageSubscription();
    } catch (error) {
      Alert.alert('Portal error', error instanceof Error ? error.message : 'Failed to open billing portal.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.push('/(protected)/(tabs)/dashboard')}>
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Text style={styles.title}>{isPremium ? 'Your Premium Plan' : 'Upgrade to Premium'}</Text>
        <Text style={styles.subtitle}>
          {isPremium
            ? 'You have unlimited access to all premium features.'
            : 'Unlock unlimited AI-powered features for your college application workflow.'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.body}>Loading subscription details...</Text>
        </View>
      ) : (
        <>
          {!isPremium ? (
            <View style={styles.usageCard}>
              <Text style={styles.usageLabel}>Daily Tokens Remaining</Text>
              <Text style={styles.usageValue}>
                {remainingLabel} / {limitLabel}
              </Text>
            </View>
          ) : null}

          <View style={styles.plansWrap}>
            <PlanCard
              title="Free"
              price="$0"
              description="Good for exploring the platform"
              features={FREE_FEATURES}
              badge={!isPremium ? 'Current Plan' : null}
            />

            <PlanCard
              title="Premium"
              price="$5.00"
              description="Unlimited AI guidance and premium tools"
              features={PREMIUM_FEATURES}
              badge={isPremium ? 'Active' : 'Recommended'}
            />
          </View>

          {isPremium ? (
            <Pressable
              style={[styles.secondaryButton, isOpeningPortal && styles.disabledButton]}
              onPress={() => void handleManageSubscription()}
              disabled={isOpeningPortal}
            >
              <Text style={styles.secondaryButtonText}>
                {isOpeningPortal ? 'Opening...' : 'Manage Subscription'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryButton, isLaunchingCheckout && styles.disabledButton]}
              onPress={() => void handleStartCheckout()}
              disabled={isLaunchingCheckout}
            >
              <Text style={styles.primaryButtonText}>{isLaunchingCheckout ? 'Opening...' : 'Upgrade Now'}</Text>
            </Pressable>
          )}

          {renewalLabel && isPremium ? <Text style={styles.renewText}>Renews on {renewalLabel}</Text> : null}
        </>
      )}
    </Screen>
  );
}

function PlanCard({
  title,
  price,
  description,
  features,
  badge,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  badge: string | null;
}) {
  return (
    <View style={styles.planCard}>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.planDescription}>{description}</Text>
      <View style={styles.featureList}>
        {features.map((feature) => (
          <Text key={feature} style={styles.featureItem}>
            • {feature}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  body: {
    fontSize: 14,
    color: colors.mutedText,
  },
  usageCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  usageLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  usageValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  plansWrap: {
    gap: 10,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE68A',
    color: '#92400E',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  planTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  planPrice: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  planDescription: {
    color: colors.mutedText,
    fontSize: 13,
  },
  featureList: {
    gap: 4,
    paddingTop: 4,
  },
  featureItem: {
    color: colors.text,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  renewText: {
    textAlign: 'center',
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 4,
  },
});
