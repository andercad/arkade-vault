import { clientIp } from './supabase';

const req = (headers: Record<string, string | string[]>) => ({ headers });

describe('clientIp', () => {
  it('prefiere x-vercel-forwarded-for', () => {
    expect(
      clientIp(
        req({
          'x-vercel-forwarded-for': ' 1.1.1.1 ',
          'x-real-ip': '2.2.2.2',
          'x-forwarded-for': '3.3.3.3',
        }),
      ),
    ).toBe('1.1.1.1');
  });

  it('usa x-real-ip si no hay la de Vercel', () => {
    expect(clientIp(req({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' }))).toBe('2.2.2.2');
  });

  it('usa la ÚLTIMA entrada de x-forwarded-for (la primera es falsificable)', () => {
    expect(clientIp(req({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8 , 3.3.3.3' }))).toBe('3.3.3.3');
  });

  it('devuelve null sin cabeceras', () => {
    expect(clientIp(req({}))).toBeNull();
  });

  it('ignora cabeceras vacías', () => {
    expect(clientIp(req({ 'x-vercel-forwarded-for': '  ', 'x-real-ip': '2.2.2.2' }))).toBe(
      '2.2.2.2',
    );
  });
});
