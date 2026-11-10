"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface User {
  name: string;
}

interface AuthContextValue {
  user: User | null;
  login: (u: User | null) => void;
  signOut: () => void;
}

const USER_KEY = "av_user";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

// Render inicial (SSR + hidratación) como invitado; evita hydration mismatch.
function getServerSnapshot(): string | null {
  return null;
}

function writeUser(u: User | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = useMemo<User | null>(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed.name === "string" ? parsed : null;
    } catch {
      return null;
    }
  }, [raw]);

  const login = useCallback((u: User | null) => writeUser(u), []);
  const signOut = useCallback(() => writeUser(null), []);

  const value = useMemo(
    () => ({ user, login, signOut }),
    [user, login, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
