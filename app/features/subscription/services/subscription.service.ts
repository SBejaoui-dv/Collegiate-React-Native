import { getAccessToken } from '@/app/features/auth/services/auth.service';
import type {
  CheckoutSessionResponse,
  PortalSessionResponse,
  SubscriptionStatus,
  TokenStatus,
} from '@/app/features/subscription/types/subscription.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

async function withAuthHeaders() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be logged in to access premium features.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function getTokenStatus(): Promise<TokenStatus> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/tokens/status`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch token status.');
  }

  return payload as TokenStatus;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/stripe/subscription-status`, {
    method: 'GET',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to fetch subscription status.');
  }

  return payload as SubscriptionStatus;
}

export async function createCheckoutSession(email: string): Promise<CheckoutSessionResponse> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to create checkout session.');
  }

  return payload as CheckoutSessionResponse;
}

export async function createPortalSession(): Promise<PortalSessionResponse> {
  const headers = await withAuthHeaders();
  const response = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
    method: 'POST',
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to create portal session.');
  }

  return payload as PortalSessionResponse;
}
