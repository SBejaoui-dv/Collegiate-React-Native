export interface TokenStatus {
  plan: 'free' | 'premium';
  is_premium: boolean;
  tokens_used: number;
  tokens_limit: number | null;
  tokens_remaining: number | null;
}

export interface SubscriptionStatus {
  plan: 'free' | 'premium';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  is_premium: boolean;
  current_period_end: string | null;
  has_subscription: boolean;
}

export interface CheckoutSessionResponse {
  url: string;
  session_id: string;
}

export interface PortalSessionResponse {
  url: string;
}
