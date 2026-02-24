import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
} from '@/app/features/auth/types/auth.types';
import { getSupabaseConfig } from '@/lib/supabase';

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type PersistedSession = {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
};

type SupabaseAuthResponse = {
  user?: SupabaseUser;
  session?: SupabaseSession | null;
  access_token?: string;
  refresh_token?: string;
};

const SESSION_STORAGE_KEY = 'collegiate.auth.session';
const SESSION_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${SESSION_STORAGE_KEY}.json`
  : null;

function toErrorMessage(responseBody: unknown, fallback: string) {
  if (!responseBody || typeof responseBody !== 'object') {
    return fallback;
  }

  const body = responseBody as Record<string, unknown>;
  const message = body.msg || body.message || body.error_description || body.error;

  if (typeof message !== 'string' || !message.trim()) {
    return fallback;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  if (normalized.includes('token has expired') || normalized.includes('expired')) {
    return 'Your reset token is invalid or expired.';
  }

  return message;
}

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  const metadata = user.user_metadata ?? {};
  const fullNameFromMetadata =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.first_name === 'string' && metadata.first_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    '';

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: fullNameFromMetadata || user.email?.split('@')[0] || 'User',
    role: metadata.role === 'counselor' ? 'counselor' : 'student',
  };
}

function extractSession(body: SupabaseAuthResponse): SupabaseSession | null {
  if (body.session?.access_token) {
    return body.session;
  }

  if (body.access_token) {
    return {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    };
  }

  return null;
}

async function writeSession(session: PersistedSession): Promise<void> {
  const serialized = JSON.stringify(session);

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEY, serialized);
    }
    return;
  }

  if (!SESSION_FILE_URI) {
    return;
  }

  await FileSystem.writeAsStringAsync(SESSION_FILE_URI, serialized);
}

async function readSession(): Promise<PersistedSession | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as PersistedSession;
    } catch {
      return null;
    }
  }

  if (!SESSION_FILE_URI) {
    return null;
  }

  const info = await FileSystem.getInfoAsync(SESSION_FILE_URI);
  if (!info.exists) {
    return null;
  }

  try {
    const value = await FileSystem.readAsStringAsync(SESSION_FILE_URI);
    return JSON.parse(value) as PersistedSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return;
  }

  if (!SESSION_FILE_URI) {
    return;
  }

  const info = await FileSystem.getInfoAsync(SESSION_FILE_URI);
  if (info.exists) {
    await FileSystem.deleteAsync(SESSION_FILE_URI, { idempotent: true });
  }
}

async function getUserWithAccessToken(accessToken: string): Promise<AuthUser | null> {
  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = (await response.json().catch(() => null)) as {
    id?: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;

  if (!response.ok || !body?.id) {
    return null;
  }

  return mapSupabaseUser({
    id: body.id,
    email: body.email,
    user_metadata: body.user_metadata,
  });
}

async function refreshSession(refreshToken: string): Promise<SupabaseSession | null> {
  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  const body = (await response.json().catch(() => null)) as SupabaseAuthResponse | null;
  if (!response.ok || !body) {
    return null;
  }

  return extractSession(body);
}

async function persistIfSessionPresent(body: SupabaseAuthResponse): Promise<void> {
  const session = extractSession(body);
  if (!session?.access_token || !body.user) {
    return;
  }

  await writeSession({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: mapSupabaseUser(body.user),
  });
}

export async function restoreUserFromSession(): Promise<AuthUser | null> {
  const existingSession = await readSession();

  if (!existingSession?.accessToken) {
    return null;
  }

  try {
    const existingUser = await getUserWithAccessToken(existingSession.accessToken);
    if (existingUser) {
      await writeSession({ ...existingSession, user: existingUser });
      return existingUser;
    }

    if (!existingSession.refreshToken) {
      await clearSession();
      return null;
    }

    const refreshed = await refreshSession(existingSession.refreshToken);
    if (!refreshed?.access_token) {
      await clearSession();
      return null;
    }

    const refreshedUser = await getUserWithAccessToken(refreshed.access_token);
    if (!refreshedUser) {
      await clearSession();
      return null;
    }

    await writeSession({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? existingSession.refreshToken,
      user: refreshedUser,
    });

    return refreshedUser;
  } catch {
    await clearSession();
    return null;
  }
}

export async function signIn(payload: SignInPayload): Promise<AuthUser> {
  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  const body = (await response.json().catch(() => null)) as SupabaseAuthResponse | null;

  if (!response.ok || !body?.user) {
    throw new Error(toErrorMessage(body, 'Unable to sign in.'));
  }

  await persistIfSessionPresent(body);

  return mapSupabaseUser(body.user);
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
      data: {
        full_name: payload.fullName,
        role: payload.role,
        school_name: payload.schoolName,
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as SupabaseAuthResponse | null;

  if (!response.ok || !body?.user) {
    throw new Error(toErrorMessage(body, 'Unable to create account.'));
  }

  await persistIfSessionPresent(body);

  return mapSupabaseUser(body.user);
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  const { url, anonKey, passwordResetRedirectUrl } = getSupabaseConfig();

  const response = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      redirect_to: passwordResetRedirectUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(toErrorMessage(body, 'Unable to send reset link.'));
  }
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  const { url, anonKey } = getSupabaseConfig();

  const verifyResponse = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({
      type: 'recovery',
      token: payload.token.trim(),
    }),
  });

  const verifyBody = (await verifyResponse.json().catch(() => null)) as SupabaseAuthResponse | null;

  if (!verifyResponse.ok) {
    throw new Error(toErrorMessage(verifyBody, 'Invalid or expired reset token.'));
  }

  const session = extractSession(verifyBody ?? {});
  if (!session?.access_token) {
    throw new Error('Reset token could not be verified.');
  }

  const updateResponse = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      password: payload.newPassword,
    }),
  });

  if (!updateResponse.ok) {
    const updateBody = await updateResponse.json().catch(() => null);
    throw new Error(toErrorMessage(updateBody, 'Unable to reset password.'));
  }
}
