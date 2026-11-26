"use server";

import { createAuthActionClient, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateSignIn,
  validateSignUp,
  type AuthResult,
} from "@/lib/auth-validation";
import {
  GENERIC_ERROR,
  INVALID_CREDENTIALS,
  signInError,
  signUpError,
} from "@/lib/auth-errors";

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

// SPEC 20: origen fijo por entorno; nunca de Origin/Host (manipulables).
function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (url) return url;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("Falta NEXT_PUBLIC_SITE_URL en el entorno del servidor.");
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const username = field(formData, "username");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  const invalid = validateSignUp({ username, email, password });
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // profiles es de lectura pública: comprobamos que el usuario esté libre.
  const { data: taken, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toUpperCase())
    .maybeSingle();
  if (lookupError) {
    console.error("[auth] Error al comprobar el usuario:", lookupError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (taken) return { ok: false, error: "Ese usuario ya existe." };

  // Solo para auth.*: la clave secreta salta RLS (SPEC 17).
  const authClient = await createAuthActionClient();
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
    },
  });
  if (error) {
    const known = signUpError(error.code);
    if (known) return { ok: false, error: known };
    console.error("[auth] Error en signUp:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Con confirmación activa, un correo ya registrado no da error: devuelve un
  // usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Ese correo ya está registrado." };
  }

  return { ok: true, needsConfirmation: !data.session, email };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const identifier = field(formData, "identifier");
  const password = String(formData.get("password") ?? "");

  const invalid = validateSignIn({ identifier, password });
  if (invalid) return { ok: false, error: invalid };

  let email = identifier;
  if (!identifier.includes("@")) {
    try {
      const { data, error } = await createAdminClient().rpc(
        "email_for_username",
        { p_username: identifier },
      );
      if (error) throw error;
      // Usuario inexistente: mismo mensaje que contraseña mala (no enumerar).
      if (!data) return { ok: false, error: INVALID_CREDENTIALS };
      email = data;
    } catch (err) {
      console.error("[auth] Error al resolver el usuario:", err);
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  // Solo para auth.*: la clave secreta salta RLS (SPEC 17).
  const authClient = await createAuthActionClient();
  const { error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    const known = signInError(error.code);
    if (known) return { ok: false, error: known };
    console.error("[auth] Error en signIn:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}
