"use server";

import { Resend } from "resend";
import { validateContact, type ContactResult } from "@/lib/contact";

const GENERIC_ERROR = "No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.";

export async function sendContactMessage(formData: FormData): Promise<ContactResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  // Honeypot: un humano nunca rellena este campo. Se responde éxito sin enviar.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    return { ok: true, name };
  }

  const parsed = validateContact(raw);
  if (!parsed.ok) return parsed;
  const { name, email, message } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL");
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name.replace(/[\r\n]+/g, " ")}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });
    if (error) {
      console.error("[contact] Error de Resend:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true, name };
}
