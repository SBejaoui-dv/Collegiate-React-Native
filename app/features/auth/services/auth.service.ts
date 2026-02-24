import {
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
} from '@/app/features/auth/types/auth.types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const userStore = new Map<
  string,
  {
    user: AuthUser;
    password: string;
  }
>();

userStore.set('demo@student.com', {
  user: {
    id: 'seed-student-1',
    email: 'demo@student.com',
    fullName: 'Demo Student',
    role: 'student',
  },
  password: 'password123',
});

export async function signIn(payload: SignInPayload): Promise<AuthUser> {
  await sleep(450);

  const email = payload.email.trim().toLowerCase();
  const record = userStore.get(email);

  if (!record || record.password !== payload.password) {
    throw new Error('Invalid email or password.');
  }

  return record.user;
}

export async function signUp(payload: SignUpPayload): Promise<AuthUser> {
  await sleep(500);

  const email = payload.email.trim().toLowerCase();

  if (userStore.has(email)) {
    throw new Error('An account with this email already exists.');
  }

  const user: AuthUser = {
    id: `user-${Date.now()}`,
    email,
    fullName: payload.fullName.trim(),
    role: payload.role,
  };

  userStore.set(email, {
    user,
    password: payload.password,
  });

  return user;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await sleep(400);

  const email = payload.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Email is required.');
  }
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await sleep(450);

  if (!payload.token.trim()) {
    throw new Error('Reset token is required.');
  }

  if (payload.newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
}
