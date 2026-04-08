import { useCallback } from 'react';

import { useSubscription } from '@/app/features/subscription/store/subscription.context';

type TokenGateResult = {
  canUse: boolean;
  withTokenCheck: <T>(apiCall: () => Promise<T>) => Promise<T>;
};

export function useTokenGate(): TokenGateResult {
  const { isPremium, tokensRemaining, refresh } = useSubscription();
  const canUse = isPremium || (tokensRemaining !== null && tokensRemaining > 0);

  const withTokenCheck = useCallback(
    async <T>(apiCall: () => Promise<T>): Promise<T> => {
      if (!isPremium && tokensRemaining !== null && tokensRemaining <= 0) {
        await refresh();
        throw new Error('Daily token limit reached');
      }

      try {
        const result = await apiCall();
        await refresh();
        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Daily token limit reached')) {
          await refresh();
        }
        throw error;
      }
    },
    [isPremium, refresh, tokensRemaining],
  );

  return { canUse, withTokenCheck };
}
