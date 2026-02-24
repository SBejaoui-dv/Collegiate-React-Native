import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearSession,
  forgotPassword,
  resetPassword,
  restoreUserFromSession,
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
  isHydrating: boolean;
  signIn: (payload: SignInPayload) => Promise<AuthUser>;
  signUp: (payload: SignUpPayload) => Promise<AuthUser>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const restoredUser = await restoreUserFromSession();
        if (isMounted) {
          setUser(restoredUser);
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isHydrating,
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
        void clearSession();
      },
    }),
    [isHydrating, user],
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
