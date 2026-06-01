import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../services/auth';
import * as authService from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        authService.ensureProfile(nextUser).catch((error) => {
          if (__DEV__) {
            console.warn('[auth] ensureProfile on session restore failed', error);
          }
        });
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      busy,
      signIn: async (email, password) => {
        setBusy(true);
        try {
          await authService.signIn(email, password);
        } finally {
          setBusy(false);
        }
      },
      signUp: async (email, password, fullName) => {
        setBusy(true);
        try {
          await authService.signUp(email, password, fullName);
        } finally {
          setBusy(false);
        }
      },
      signOut: authService.signOut,
    }),
    [user, loading, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
