import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { useAuth } from '@/app/features/auth/store/auth.context';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  getTokenStatus,
} from '@/app/features/subscription/services/subscription.service';
import type { SubscriptionStatus, TokenStatus } from '@/app/features/subscription/types/subscription.types';

type SubscriptionContextValue = {
  tokenStatus: TokenStatus | null;
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  isPremium: boolean;
  tokensRemaining: number | null;
  refresh: () => Promise<void>;
  startCheckout: () => Promise<void>;
  manageSubscription: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setTokenStatus(null);
      setSubscriptionStatus(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [tokensResult, subscriptionResult] = await Promise.allSettled([
        getTokenStatus(),
        getSubscriptionStatus(),
      ]);

      if (tokensResult.status === 'fulfilled') {
        setTokenStatus(tokensResult.value);
      } else {
        setTokenStatus(null);
      }

      if (subscriptionResult.status === 'fulfilled') {
        setSubscriptionStatus(subscriptionResult.value);
      } else {
        setSubscriptionStatus(null);
      }
    } catch {
      setTokenStatus(null);
      setSubscriptionStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startCheckout = useCallback(async () => {
    if (!user?.email) {
      throw new Error('Missing account email.');
    }

    const { url } = await createCheckoutSession(user.email);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('Unable to open checkout URL.');
    }
    await Linking.openURL(url);
  }, [user]);

  const manageSubscription = useCallback(async () => {
    const { url } = await createPortalSession();
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('Unable to open portal URL.');
    }
    await Linking.openURL(url);
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tokenStatus,
      subscriptionStatus,
      isLoading,
      isPremium: subscriptionStatus?.is_premium ?? tokenStatus?.is_premium ?? false,
      tokensRemaining:
        subscriptionStatus?.is_premium || tokenStatus?.is_premium ? null : (tokenStatus?.tokens_remaining ?? null),
      refresh,
      startCheckout,
      manageSubscription,
    }),
    [isLoading, manageSubscription, refresh, startCheckout, subscriptionStatus, tokenStatus],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider.');
  }
  return context;
}
