"use server";

import { createAuthActionClient, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PASSWORD_ERROR,
  validatePassword,
  type AuthResult,
} from "@/lib/auth-validation";
import {
  CURRENT_PASSWORD_ERROR,
  GENERIC_ERROR,
  SAME_PASSWORD_ERROR,
  updatePasswordError,
  verifyPasswordError,
} from "@/lib/auth-errors";

const NO_SESSION = "Inicia sesión para continuar.";

// SPEC 19: borra la cuenta del usuario de la sesión. El cascade (0010, 0013)
// elimina su profiles y sus scores.
export async function deleteAccount(formData: FormData): Promise<AuthResult> {
  const confirm = String(formData.get("confirm") ?? "")
    .trim()
    .toUpperCase();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: NO_SESSION };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    if (profileError)
      console.error("[perfil] Error al leer perfil:", profileError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (!confirm || confirm !== profile.username) {
    return { ok: false, error: "El usuario no coincide." };
  }

  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (err) {
    console.error("[perfil] Error al eliminar la cuenta:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  // El usuario ya no existe: solo limpia las cookies de esta sesión.
  const { error: signOutError } = await supabase.auth.signOut({
    scope: "local",
  });
  if (signOutError) {
    console.error("[perfil] Error al limpiar la sesión:", signOutError);
  }
  return { ok: true };
}

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
    return { ok: false, error: CURRENT_PASSWORD_ERROR };
  }
  const weak = validatePassword(password);
  if (weak) return { ok: false, error: PASSWORD_ERROR };
  if (password !== repeat) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }
  if (password === current) {
    return { ok: false, error: SAME_PASSWORD_ERROR };
  }

  // Solo para auth.*: la clave secreta salta RLS y reenvía la IP (SPEC 17).
  const authClient = await createAuthActionClient();

  // Verifica la actual (cuenta en el rate limit por IP) y deja una sesión nueva.
  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verifyError) {
    const known = verifyPasswordError(verifyError.code);
    if (known) return { ok: false, error: known };
    console.error("[perfil] Error al verificar la contraseña:", verifyError);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { error: updateError } = await authClient.auth.updateUser({ password });
  if (updateError) {
    const known = updatePasswordError(updateError.code);
    if (known) return { ok: false, error: known };
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
