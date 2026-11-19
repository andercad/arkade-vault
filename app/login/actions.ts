"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateSignIn,
  validateSignUp,
  type AuthResult,
} from "@/lib/auth-validation";

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";
const INVALID_CREDENTIALS = "Usuario o contraseña incorrectos.";

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { ok: false, error: "Ese correo ya está registrado." };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: "La contraseña es demasiado débil." };
    }
    if (error.code === "over_email_send_rate_limit") {
      return {
        ok: false,
        error: "Demasiados correos enviados. Inténtalo más tarde.",
      };
    }
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Confirma tu email antes de entrar." };
    }
    if (error.code === "invalid_credentials") {
      return { ok: false, error: INVALID_CREDENTIALS };
    }
    console.error("[auth] Error en signIn:", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}
