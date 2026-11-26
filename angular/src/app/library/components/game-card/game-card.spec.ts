import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Game } from '@/lib/games';
import { GameCardComponent } from './game-card';

const GAME: Game = {
  id: 'snake',
  title: 'SNAKE',
  short: 'Come frutas.',
  long: 'Larga.',
  cat: 'ARCADE',
  cover: 'cover-snake',
  color: 'green',
  best: 12345,
  plays: 7,
};

describe('GameCardComponent', () => {
  function create() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(GameCardComponent);
    fixture.componentRef.setInput('game', GAME);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('pinta portada, categoría, título, descripción y mejor puntuación', () => {
    const { el } = create();
    expect(el.classList.contains('card') && el.classList.contains('accent-green')).toBe(true);
    expect(Array.from(el.querySelector('.cover-bg')!.classList).sort()).toEqual([
      'cover-bg',
      'cover-snake',
    ]);
    expect(el.querySelector('.label')?.textContent).toBe('ARCADE');
    expect(Array.from(el.querySelector('.label')!.classList).sort()).toEqual([
      'accent-green',
      'label',
    ]);
    expect(el.querySelector('.title')?.textContent).toBe('SNAKE');
    expect(el.querySelector('.desc')?.textContent).toBe('Come frutas.');
    expect(el.querySelector('.score-badge b')?.textContent).toBe('12.345');
  });

  it('el enlace JUGAR apunta a la ficha, con color y nombre accesible', () => {
    const a = create().el.querySelector('a.btn') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/juegos/snake');
    expect(a.className).toContain('green');
    expect(a.getAttribute('aria-label')).toBe('Jugar SNAKE');
  });

  it('un clic en la tarjeta navega a la ficha', () => {
    const { el } = create();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.click();
    expect(nav).toHaveBeenCalledWith('/juegos/snake');
  });

  it('el clic en JUGAR no se propaga a la tarjeta (una sola navegación, la del enlace)', () => {
    const { el } = create();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    (el.querySelector('a.btn') as HTMLElement).click();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(nav).not.toHaveBeenCalledWith('/juegos/snake');
  });

  it('se inclina con el ratón y se restablece al salir', () => {
    const { el } = create();
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
    expect(el.style.transform).toContain('translateY(-6px)');
    el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(el.style.transform).toBe('');
  });
});
