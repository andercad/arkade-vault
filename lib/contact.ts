export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(
  raw: Record<string, unknown>,
): { ok: true; data: ContactInput } | { ok: false; error: string } {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!name || !email || !message) {
    return { ok: false, error: "Completa todos los campos." };
  }
  if (name.length > CONTACT_LIMITS.name) {
    return { ok: false, error: `El nombre no puede superar ${CONTACT_LIMITS.name} caracteres.` };
  }
  if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "El correo electrónico no es válido." };
  }
  if (message.length > CONTACT_LIMITS.message) {
    return { ok: false, error: `El mensaje no puede superar ${CONTACT_LIMITS.message} caracteres.` };
  }

  return { ok: true, data: { name, email, message } };
}
