import { Router, type Request, type Response } from 'express';
import { Resend } from 'resend';
import { validateContact } from '@/lib/contact';

const GENERIC_ERROR = 'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.';

/** Mensaje listo para enviar. */
export interface ContactEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

/** Configuración de Resend; `null` si falta alguna variable. */
export interface ContactEnv {
  apiKey: string;
  to: string;
  from: string;
}

/** Dependencias del router de contacto; el envío se inyecta para poder probarlo. */
export interface ContactDeps {
  /** Lee la configuración del entorno en cada petición; `null` si faltan variables. */
  env: () => ContactEnv | null;
  /** Envía el correo; lanza si el proveedor falla. */
  send: (apiKey: string, email: ContactEmail) => Promise<void>;
}

/** Envío real con Resend (la API devuelve `{ error }` en vez de lanzar). */
export async function sendWithResend(apiKey: string, email: ContactEmail): Promise<void> {
  const { error } = await new Resend(apiKey).emails.send(email);
  if (error) throw new Error(`Resend: ${error.message}`);
}

/** Lee `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`; `null` si falta alguna. */
export function contactEnvFromProcess(env: NodeJS.ProcessEnv = process.env): ContactEnv | null {
  const apiKey = env['RESEND_API_KEY'];
  const to = env['CONTACT_TO_EMAIL'];
  const from = env['CONTACT_FROM_EMAIL'];
  return apiKey && to && from ? { apiKey, to, from } : null;
}

/**
 * `POST /api/contact { name, email, message, website }` → 204. `website` es el honeypot: si
 * viene relleno se responde éxito sin enviar. 400 si no valida (`lib/contact.ts`); 500
 * genérico si faltan variables o falla Resend (el detalle va solo al log). Sin límite de
 * envíos (paridad con Next).
 */
export function createContactRouter(deps: ContactDeps): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body['website'] === 'string' && body['website'].trim() !== '') {
      res.status(204).end();
      return;
    }

    const parsed = validateContact(body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { name, email, message } = parsed.data;

    const env = deps.env();
    if (!env) {
      console.error(
        '[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL',
      );
      res.status(500).json({ error: GENERIC_ERROR });
      return;
    }

    try {
      await deps.send(env.apiKey, {
        from: env.from,
        to: env.to,
        replyTo: email,
        subject: `[Arcade Vault] Mensaje de ${name.replace(/[\r\n]+/g, ' ')}`,
        text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
      });
      res.status(204).end();
    } catch (error) {
      console.error('[contact] Fallo al enviar con Resend:', error);
      res.status(500).json({ error: GENERIC_ERROR });
    }
  });

  return router;
}
