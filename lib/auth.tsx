"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface User {
  id: string;
  name: string; // profiles.username
  avatarUrl: string | null; // foto de la red social; null → iniciales
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const supabase = createClient();

async function toUser(authUser: SupabaseUser): Promise<User> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", authUser.id)
    .maybeSingle();
  const meta = authUser.user_metadata ?? {};
  const photo = meta.avatar_url ?? meta.picture;
  return {
    id: authUser.id,
    name: data?.username ?? "PLAYER",
    avatarUrl:
      typeof photo === "string" && /^https:\/\//.test(photo) ? photo : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Render inicial (SSR + hidratación) en carga; evita parpadeo invitado→usuario.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // SPEC 16: la sesión simulada antigua ya no se usa.
    try {
      localStorage.removeItem("av_user");
    } catch {}

    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // No hacer await de llamadas a supabase dentro del callback (deadlock):
      // se difiere con setTimeout.
      setTimeout(async () => {
        const next = session?.user ? await toUser(session.user) : null;
        if (cancelled) return;
        setUser(next);
        setLoading(false);
      }, 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signOut }),
    [user, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
