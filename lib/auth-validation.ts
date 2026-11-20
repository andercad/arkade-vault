// SPEC 16: validación compartida entre el formulario (cliente) y las Server Actions.

export const USERNAME_RE = /^[A-Za-z0-9_]{3,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
// SPEC 17: mismo set de símbolos que Supabase: !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
const PASSWORD_SYMBOL_RE = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export const isValidEmail = (email: string) => EMAIL_RE.test(email);

export const USERNAME_ERROR =
  "Usuario: 3 a 10 caracteres (letras, números o _).";
export const EMAIL_ERROR = "Introduce un correo electrónico válido.";
export const PASSWORD_ERROR = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres, con minúscula, mayúscula, número y símbolo.`;

// Misma regla que Supabase Auth (longitud + minúscula, mayúscula, dígito y símbolo).
export function validatePassword(password: string): string | null {
  if (
    password.length < MIN_PASSWORD ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !PASSWORD_SYMBOL_RE.test(password)
  ) {
    return PASSWORD_ERROR;
  }
  return null;
}

export type AuthResult =
  | { ok: true; needsConfirmation?: boolean; email?: string }
  | { ok: false; error: string };

export function validateSignUp(input: {
  username: string;
  email: string;
  password: string;
}): string | null {
  if (!USERNAME_RE.test(input.username)) return USERNAME_ERROR;
  if (!EMAIL_RE.test(input.email)) return EMAIL_ERROR;
  return validatePassword(input.password);
}

export function validateSignIn(input: {
  identifier: string;
  password: string;
}): string | null {
  if (!input.identifier) return "Introduce tu usuario o correo.";
  if (input.identifier.includes("@")) {
    if (!EMAIL_RE.test(input.identifier)) return EMAIL_ERROR;
  } else if (!USERNAME_RE.test(input.identifier)) {
    return USERNAME_ERROR;
  }
  if (!input.password) return "Introduce tu contraseña.";
  return null;
}
