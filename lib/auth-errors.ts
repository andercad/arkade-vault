// SPEC 26: mapeo de códigos de error de Supabase Auth (`error.code`, nunca el texto) a
// mensajes en español. Funciones puras compartidas por las Server Actions de Next
// (`app/login/actions.ts`, `app/perfil/actions.ts`) y el BFF de Angular. Devuelven `null`
// para un código desconocido: quien llama registra el error y usa `GENERIC_ERROR`.
import { PASSWORD_ERROR } from "@/lib/auth-validation";

export const GENERIC_ERROR =
  "No se pudo completar la operación. Inténtalo de nuevo.";
export const INVALID_CREDENTIALS = "Usuario o contraseña incorrectos.";
export const RATE_LIMIT_ERROR =
  "Demasiados intentos. Espera unos minutos y vuelve a probar.";
export const CURRENT_PASSWORD_ERROR = "La contraseña actual no es correcta.";
export const SAME_PASSWORD_ERROR =
  "La nueva contraseña debe ser distinta de la anterior.";

/** `auth.signUp`. */
export function signUpError(code: string | undefined): string | null {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Ese correo ya está registrado.";
    case "weak_password":
      return PASSWORD_ERROR;
    case "over_request_rate_limit":
      return RATE_LIMIT_ERROR;
    case "over_email_send_rate_limit":
      return "Demasiados correos enviados. Inténtalo más tarde.";
    default:
      return null;
  }
}

/** `auth.signInWithPassword` al iniciar sesión. */
export function signInError(code: string | undefined): string | null {
  switch (code) {
    case "over_request_rate_limit":
      return RATE_LIMIT_ERROR;
    case "email_not_confirmed":
      return "Confirma tu email antes de entrar.";
    case "invalid_credentials":
      return INVALID_CREDENTIALS;
    default:
      return null;
  }
}

/** `auth.signInWithPassword` al verificar la contraseña actual (cambio de contraseña). */
export function verifyPasswordError(code: string | undefined): string | null {
  switch (code) {
    case "over_request_rate_limit":
      return RATE_LIMIT_ERROR;
    case "invalid_credentials":
      return CURRENT_PASSWORD_ERROR;
    default:
      return null;
  }
}

/** `auth.updateUser({ password })`. */
export function updatePasswordError(code: string | undefined): string | null {
  switch (code) {
    case "same_password":
      return SAME_PASSWORD_ERROR;
    case "weak_password":
      return PASSWORD_ERROR;
    case "over_request_rate_limit":
      return RATE_LIMIT_ERROR;
    default:
      return null;
  }
}
