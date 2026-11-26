import { formatScore } from './format';

describe('formatScore', () => {
  it('agrupa miles con punto (es-ES)', () => {
    expect(formatScore(1234567)).toBe('1.234.567');
  });

  it('no agrupa menos de 5 cifras (regla es-ES)', () => {
    expect(formatScore(9999)).toBe('9999');
    expect(formatScore(0)).toBe('0');
  });
});
