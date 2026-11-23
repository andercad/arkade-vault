"use server";

import { createAuthActionClient, createClient } from "@/lib/supabase/server";
import {
  PASSWORD_ERROR,
  validatePassword,
  type AuthResult,
} from "@/lib/auth-validation";

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo.";
const NO_SESSION = "Inicia sesión para continuar.";
const RATE_LIMIT_ERROR =
  "Demasiados intentos. Espera unos minutos y vuelve a probar.";

// SPEC 19: el usuario sale siempre de la sesión (cookies), nunca del cliente.
export async function changePassword(formData: FormData): Promise<AuthResult> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: NO_SESSION };

  // Solo cuentas con identidad email tienen contraseña (se re-comprueba aquí).
  const providers: unknown = user.app_metadata?.providers;
  const hasPassword = Array.isArray(providers) && providers.includes("email");
  if (!hasPassword || !user.email) return { ok: false, error: GENERIC_ERROR };

  if (!current) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }
  const weak = validatePassword(password);
  if (weak) return { ok: false, error: PASSWORD_ERROR };
  if (password !== repeat) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }
  if (password === current) {
    return {
      ok: false,
      error: "La nueva contraseña debe ser distinta de la anterior.",
    };
  }

  // Solo para auth.*: la clave secreta salta RLS y reenvía la IP (SPEC 17).
  const authClient = await createAuthActionClient();

  // Verifica la actual (cuenta en el rate limit por IP) y deja una sesión nueva.
  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verifyError) {
    if (verifyError.code === "over_request_rate_limit") {
      return { ok: false, error: RATE_LIMIT_ERROR };
    }
    if (verifyError.code === "invalid_credentials") {
      return { ok: false, error: "La contraseña actual no es correcta." };
    }
    console.error("[perfil] Error al verificar la contraseña:", verifyError);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { error: updateError } = await authClient.auth.updateUser({ password });
  if (updateError) {
    if (updateError.code === "same_password") {
      return {
        ok: false,
        error: "La nueva contraseña debe ser distinta de la anterior.",
      };
    }
    if (updateError.code === "weak_password") {
      return { ok: false, error: PASSWORD_ERROR };
    }
    if (updateError.code === "over_request_rate_limit") {
      return { ok: false, error: RATE_LIMIT_ERROR };
    }
    console.error("[perfil] Error al cambiar la contraseña:", updateError);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Cierra las sesiones de otros dispositivos; la actual sigue abierta.
  const { error: signOutError } = await authClient.auth.signOut({
    scope: "others",
  });
  if (signOutError) {
    console.error("[perfil] Error al cerrar otras sesiones:", signOutError);
  }

  return { ok: true };
}
