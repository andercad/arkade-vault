import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Category, Game } from '@/lib/games';
import { GameLibraryComponent } from './game-library';

const game = (id: string, title: string, cat: Category): Game => ({
  id,
  title,
  short: '',
  long: '',
  cat,
  cover: '',
  color: 'green',
  best: 0,
  plays: 0,
});

// Orden de entrada distinto al de CATEGORIES para comprobar el orden de los chips.
const GAMES = [
  game('tetris', 'TETRIS', 'PUZZLE'),
  game('snake', 'SNAKE', 'ARCADE'),
  game('asteroids', 'ASTEROIDS', 'SHOOTER'),
  game('arkanoid', 'ARKANOID', 'ARCADE'),
];

describe('GameLibraryComponent', () => {
  let fixture: ComponentFixture<GameLibraryComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(GameLibraryComponent);
    fixture.componentRef.setInput('games', GAMES);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  const titles = () => Array.from(el.querySelectorAll('.card .title')).map((t) => t.textContent);
  const chips = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.chip'));
  const chip = (label: string) => chips().find((c) => c.textContent?.trim() === label)!;

  function search(text: string): void {
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function pick(label: string): void {
    chip(label).click();
    fixture.detectChanges();
  }

  it('muestra todas las tarjetas al inicio', () => {
    expect(titles()).toEqual(['TETRIS', 'SNAKE', 'ASTEROIDS', 'ARKANOID']);
  });

  it('chips: TODOS + solo categorías con juegos, en el orden de CATEGORIES', () => {
    expect(chips().map((c) => c.textContent?.trim())).toEqual([
      'TODOS',
      'ARCADE',
      'PUZZLE',
      'SHOOTER',
    ]);
  });

  it('TODOS lleva chip-all y activo; el resto, acento de su categoría', () => {
    expect(Array.from(chip('TODOS').classList).sort()).toEqual(['active', 'chip', 'chip-all']);
    expect(Array.from(chip('ARCADE').classList).sort()).toEqual(['accent-green', 'chip']);
  });

  it('chips con aria-pressed según el filtro activo', () => {
    expect(chip('TODOS').getAttribute('aria-pressed')).toBe('true');
    pick('PUZZLE');
    expect(chip('PUZZLE').getAttribute('aria-pressed')).toBe('true');
    expect(chip('TODOS').getAttribute('aria-pressed')).toBe('false');
  });

  it('filtra por categoría', () => {
    pick('ARCADE');
    expect(titles()).toEqual(['SNAKE', 'ARKANOID']);
    pick('TODOS');
    expect(titles().length).toBe(4);
  });

  it('filtra por texto sin distinguir mayúsculas', () => {
    search('ark');
    expect(titles()).toEqual(['ARKANOID']);
  });

  it('combina texto y categoría', () => {
    pick('ARCADE');
    search('s');
    expect(titles()).toEqual(['SNAKE']);
  });

  it('sin resultados muestra el aviso', () => {
    search('zzz');
    expect(titles()).toEqual([]);
    expect(el.querySelector('.no-results')?.textContent).toContain('NO HAY RESULTADOS');
  });

  it('el buscador tiene nombre accesible', () => {
    expect(el.querySelector('input')?.getAttribute('aria-label')).toBe(
      'Buscar un juego por nombre',
    );
  });
});
