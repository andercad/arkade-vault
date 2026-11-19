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
import {
  USERNAME_ERROR,
  USERNAME_RE,
  type AuthResult,
} from "@/lib/auth-validation";

export interface User {
  id: string;
  name: string; // profiles.username
  avatarUrl: string | null; // foto de la red social; null → iniciales
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Valida, actualiza profiles y refresca user.name (nav, reproductor, Salón).
  updateUsername: (name: string) => Promise<AuthResult>;
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

  const userId = user?.id;
  const updateUsername = useCallback(
    async (raw: string): Promise<AuthResult> => {
      const name = raw.trim();
      if (!userId) return { ok: false, error: "Inicia sesión para continuar." };
      if (!USERNAME_RE.test(name)) return { ok: false, error: USERNAME_ERROR };

      const username = name.toUpperCase();
      const { data, error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", userId)
        .select("username")
        .maybeSingle();
      if (error) {
        // 23505: el índice único profiles_username_key rechaza el duplicado.
        if (error.code === "23505") {
          return { ok: false, error: "Ese usuario ya existe." };
        }
        console.error("[auth] Error al cambiar el usuario:", error);
        return {
          ok: false,
          error: "No se pudo cambiar el usuario. Inténtalo de nuevo.",
        };
      }
      if (!data) {
        return {
          ok: false,
          error: "No se pudo cambiar el usuario. Inténtalo de nuevo.",
        };
      }
      setUser((prev) => (prev ? { ...prev, name: data.username } : prev));
      return { ok: true };
    },
    [userId],
  );

  const value = useMemo(
    () => ({ user, loading, signOut, updateUsername }),
    [user, loading, signOut, updateUsername],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
