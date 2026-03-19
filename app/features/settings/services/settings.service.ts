import { getAccessToken } from '@/app/features/auth/services/auth.service';
import { getSupabaseConfig } from '@/lib/supabase';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getAuthorizedHeaders() {
  const { anonKey } = getSupabaseConfig();
  const token = await getAccessToken();

  if (!token) {
    throw new Error('You are not logged in. Please sign in again.');
  }

  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
}

export async function updateUserEmail(nextEmail: string): Promise<void> {
  const normalizedEmail = nextEmail.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter an email address.');
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const { url } = getSupabaseConfig();
  const headers = await getAuthorizedHeaders();

  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email: normalizedEmail,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { msg?: string; message?: string; error?: string }
      | null;

    throw new Error(body?.msg || body?.message || body?.error || 'Unable to update email.');
  }
}

export async function requestAccountDeletion(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id) {
    throw new Error('Missing user identifier.');
  }

  const { url } = getSupabaseConfig();
  const headers = await getAuthorizedHeaders();

  const response = await fetch(`${url}/rest/v1/delete_requests`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: id,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { msg?: string; message?: string; error?: string }
      | null;

    throw new Error(
      body?.msg ||
        body?.message ||
        body?.error ||
        'Unable to submit account deletion request.',
    );
  }
}
