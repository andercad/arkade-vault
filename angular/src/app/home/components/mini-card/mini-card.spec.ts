import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Game } from '@/lib/games';
import { MiniCardComponent } from './mini-card';

const GAME: Game = {
  id: 'tetris',
  title: 'TETRIS',
  short: '',
  long: '',
  cat: 'PUZZLE',
  cover: 'cover-tetris',
  color: 'cyan',
  best: 0,
  plays: 0,
};

describe('MiniCardComponent', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(MiniCardComponent);
    fixture.componentRef.setInput('game', GAME);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('el host es la caja .mini-card y el enlace apunta a la ficha', () => {
    const el = render();
    expect(el.classList.contains('mini-card')).toBe(true);
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/juegos/tetris');
  });

  it('pinta portada, título y categoría con el acento del juego', () => {
    const el = render();
    expect(el.querySelector('.cover-bg')?.classList.contains('cover-tetris')).toBe(true);
    expect(el.querySelector('.mini-title')?.textContent).toBe('TETRIS');
    const cat = el.querySelector('.mini-cat') as HTMLElement;
    expect(cat.textContent).toBe('PUZZLE');
    expect(cat.classList.contains('accent-cyan')).toBe(true);
  });
});
