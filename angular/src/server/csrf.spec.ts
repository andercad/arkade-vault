import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createCsrfMiddleware } from './csrf';

const SITE = 'http://localhost:4200';

describe('createCsrfMiddleware', () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = express();
    app.use(createCsrfMiddleware(SITE));
    app.all('/ok', (_req, res) => void res.status(204).end());
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const send = (method: string, headers: Record<string, string>) =>
    fetch(`${base}/ok`, { method, headers }).then((r) => r.status);

  it('GET no se comprueba', async () => {
    expect(await send('GET', { origin: 'http://evil.test' })).toBe(204);
  });

  it('POST con Origin correcto y JSON pasa', async () => {
    expect(await send('POST', { origin: SITE, 'content-type': 'application/json' })).toBe(204);
  });

  it('POST con Origin distinto → 403', async () => {
    expect(
      await send('POST', { origin: 'http://evil.test', 'content-type': 'application/json' }),
    ).toBe(403);
  });

  it('POST sin Origin → 403', async () => {
    expect(await send('POST', { 'content-type': 'application/json' })).toBe(403);
  });

  it('POST con Origin correcto pero sin JSON → 415', async () => {
    expect(await send('POST', { origin: SITE, 'content-type': 'text/plain' })).toBe(415);
  });

  it('PATCH y DELETE también se comprueban', async () => {
    expect(await send('PATCH', { origin: 'http://evil.test' })).toBe(403);
    expect(await send('DELETE', { origin: SITE })).toBe(415);
  });
});
