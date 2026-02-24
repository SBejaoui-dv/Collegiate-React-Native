import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  forgotPassword,
  resetPassword,
  signIn,
  signUp,
} from '@/app/features/auth/services/auth.service';
import {
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
} from '@/app/features/auth/types/auth.types';

type AuthContextValue = {
  user: AuthUser | null;
  signIn: (payload: SignInPayload) => Promise<AuthUser>;
  signUp: (payload: SignUpPayload) => Promise<AuthUser>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: async (payload) => {
        const loggedInUser = await signIn(payload);
        setUser(loggedInUser);
        return loggedInUser;
      },
      signUp: async (payload) => {
        const createdUser = await signUp(payload);
        setUser(createdUser);
        return createdUser;
      },
      forgotPassword,
      resetPassword,
      signOut: () => {
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
