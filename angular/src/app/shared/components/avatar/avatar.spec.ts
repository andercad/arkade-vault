import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarComponent, initialsFor, toneFor } from './avatar';

describe('toneFor / initialsFor', () => {
  it('el tono es estable y de la paleta', () => {
    expect(toneFor('ANDER')).toBe(toneFor('ANDER'));
    expect(['cyan', 'magenta', 'violet', 'green', 'yellow', 'orange']).toContain(toneFor('PX_KAI'));
  });

  it('iniciales: dos alfanuméricos en mayúsculas', () => {
    expect(initialsFor('px_kai')).toBe('PX');
    expect(initialsFor('_a_b')).toBe('AB');
    expect(initialsFor('Z')).toBe('Z');
  });

  it('sin alfanuméricos → ?', () => {
    expect(initialsFor('__')).toBe('?');
    expect(initialsFor('')).toBe('?');
  });
});

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let el: HTMLElement;

  function setup(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(AvatarComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const root = () => el.querySelector('.av-avatar') as HTMLElement;
  const img = () => el.querySelector('img') as HTMLImageElement | null;

  it('sin foto muestra las iniciales con el tono del nombre y es decorativo', () => {
    setup({ name: 'px_kai' });
    expect(root().textContent?.trim()).toBe('PX');
    expect(root().classList.contains(`tone-${toneFor('px_kai')}`)).toBe(true);
    expect(root().getAttribute('aria-hidden')).toBe('true');
    expect(img()).toBeNull();
  });

  it('aplica el tamaño y una fuente proporcional', () => {
    setup({ name: 'ANDER', size: 88 });
    expect(root().style.width).toBe('88px');
    expect(root().style.height).toBe('88px');
    expect(root().style.fontSize).toBe('30px');
  });

  it('con foto https la pinta sin referrer y con alt vacío', () => {
    setup({ name: 'ANDER', avatarUrl: 'https://img.test/a.png' });
    expect(img()?.getAttribute('src')).toBe('https://img.test/a.png');
    expect(img()?.getAttribute('alt')).toBe('');
    expect(img()?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('una foto que no es https no se usa', () => {
    setup({ name: 'ANDER', avatarUrl: 'http://img.test/a.png' });
    expect(img()).toBeNull();
    expect(root().textContent?.trim()).toBe('AN');
  });

  it('si la foto falla cae a las iniciales; una URL nueva se reintenta', () => {
    setup({ name: 'ANDER', avatarUrl: 'https://img.test/a.png' });
    img()?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(img()).toBeNull();
    expect(root().textContent?.trim()).toBe('AN');

    fixture.componentRef.setInput('avatarUrl', 'https://img.test/b.png');
    fixture.detectChanges();
    expect(img()?.getAttribute('src')).toBe('https://img.test/b.png');
  });
});
