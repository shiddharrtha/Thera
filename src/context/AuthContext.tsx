import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ensureFirebaseInitialized, firebaseAuth } from '../lib/firebase';
import type { AuthUser } from '../services/auth';
import * as authService from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  displayName: string | null;
  loading: boolean;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshUserProfile = async (nextUser: AuthUser) => {
    await nextUser.reload();
    const current = firebaseAuth().currentUser ?? nextUser;
    setUser(current);
    const name = await authService.resolveDisplayName(current);
    setDisplayName(name);
    return current;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    ensureFirebaseInitialized()
      .then(() => {
        if (cancelled) return;
        unsubscribe = authService.onAuthStateChanged((nextUser) => {
          setUser(nextUser);
          setLoading(false);

          if (nextUser) {
            authService.resolveDisplayName(nextUser).then((name) => {
              if (!cancelled) setDisplayName(name);
            });
            authService.ensureProfile(nextUser).catch((error) => {
              if (__DEV__) {
                console.warn('[auth] ensureProfile on session restore failed', error);
              }
            });
            const firebaseName = nextUser.displayName?.trim();
            if (firebaseName) {
              authService.syncFullName(nextUser, firebaseName).catch((error) => {
                if (__DEV__) {
                  console.warn('[auth] syncFullName on session restore failed', error);
                }
              });
            }
          } else {
            setDisplayName(null);
          }
        });
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('[auth] Firebase initialization failed', error);
        }
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      displayName,
      loading,
      busy,
      signIn: async (email, password) => {
        setBusy(true);
        try {
          await authService.signIn(email, password);
          const current = firebaseAuth().currentUser;
          if (current) await refreshUserProfile(current);
        } finally {
          setBusy(false);
        }
      },
      signUp: async (email, password, fullName) => {
        setBusy(true);
        try {
          await authService.signUp(email, password, fullName);
          const current = firebaseAuth().currentUser;
          if (current) await refreshUserProfile(current);
        } finally {
          setBusy(false);
        }
      },
      signOut: authService.signOut,
    }),
    [user, displayName, loading, busy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
