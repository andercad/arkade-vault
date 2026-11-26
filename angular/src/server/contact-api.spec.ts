import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CONTACT_LIMITS } from '@/lib/contact';
import { contactEnvFromProcess, createContactRouter, type ContactEmail } from './contact-api';

describe('createContactRouter', () => {
  let server: Server;
  let base: string;
  let sent: ContactEmail[];
  let envOk: boolean;
  let sendError: unknown;
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeAll(async () => {
    const app = express();
    app.use(
      '/api/contact',
      express.json(),
      createContactRouter({
        env: () => (envOk ? { apiKey: 'key', to: 'to@x.co', from: 'from@x.co' } : null),
        send: (_key, email) => {
          if (sendError) return Promise.reject(sendError);
          sent.push(email);
          return Promise.resolve();
        },
      }),
    );
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    sent = [];
    envOk = true;
    sendError = null;
    logged.mockClear();
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const VALID = { name: 'Kai', email: 'kai@vault.gg', message: 'Hola', website: '' };
  const post = (body: unknown) =>
    fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('envía con from/to del entorno, replyTo del usuario y cuerpo de texto plano → 204', async () => {
    const res = await post(VALID);
    expect(res.status).toBe(204);
    expect(sent).toEqual([
      {
        from: 'from@x.co',
        to: 'to@x.co',
        replyTo: 'kai@vault.gg',
        subject: '[Arcade Vault] Mensaje de Kai',
        text: 'Nombre: Kai\nCorreo: kai@vault.gg\n\nMensaje:\nHola',
      },
    ]);
  });

  it('el asunto no contiene CR/LF', async () => {
    await post({ ...VALID, name: 'Kai\r\nBcc: x@y.co' });
    expect(sent[0].subject).toBe('[Arcade Vault] Mensaje de Kai Bcc: x@y.co');
    expect(sent[0].subject).not.toMatch(/[\r\n]/);
  });

  it('honeypot relleno → 204 sin enviar', async () => {
    const res = await post({ ...VALID, website: 'http://spam.test' });
    expect(res.status).toBe(204);
    expect(sent).toEqual([]);
  });

  it('honeypot solo con espacios no cuenta', async () => {
    await post({ ...VALID, website: '   ' });
    expect(sent).toHaveLength(1);
  });

  it('campos vacíos → 400 y no envía', async () => {
    const res = await post({ name: '', email: '', message: '' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Completa todos los campos.' });
    expect(sent).toEqual([]);
  });

  it('correo inválido y mensaje demasiado largo → 400', async () => {
    const mail = await post({ ...VALID, email: 'nope' });
    expect(mail.status).toBe(400);
    const long = await post({ ...VALID, message: 'm'.repeat(CONTACT_LIMITS.message + 1) });
    expect(long.status).toBe(400);
    expect(sent).toEqual([]);
  });

  it('sin variables de entorno → 500 genérico y traza en el log', async () => {
    envOk = false;
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain('No se pudo enviar el mensaje');
    expect(logged).toHaveBeenCalledOnce();
    expect(sent).toEqual([]);
  });

  it('fallo de Resend → 500 genérico sin filtrar el detalle y con traza', async () => {
    sendError = new Error('boom secreto');
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('boom');
    expect(logged).toHaveBeenCalledOnce();
  });
});

describe('contactEnvFromProcess', () => {
  it('devuelve la configuración si están las tres variables', () => {
    expect(
      contactEnvFromProcess({
        RESEND_API_KEY: 'k',
        CONTACT_TO_EMAIL: 't@x.co',
        CONTACT_FROM_EMAIL: 'f@x.co',
      }),
    ).toEqual({ apiKey: 'k', to: 't@x.co', from: 'f@x.co' });
  });

  it('null si falta cualquiera', () => {
    expect(contactEnvFromProcess({ RESEND_API_KEY: 'k', CONTACT_TO_EMAIL: 't@x.co' })).toBeNull();
    expect(contactEnvFromProcess({})).toBeNull();
  });
});
