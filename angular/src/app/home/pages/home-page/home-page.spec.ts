import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { GamesService } from '@shared/services/games.service';
import { ScoresService } from '@shared/services/scores.service';
import HomePageComponent from './home-page';

describe('HomePageComponent', () => {
  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GamesService, useValue: { getGames: () => of([]) } },
        {
          provide: ScoresService,
          useValue: { getRecent: () => of([]), getTopToday: () => of([]) },
        },
      ],
    });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta el hero con el único h1 y los botones hacia biblioteca y login', async () => {
    const el = await render();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('.home-title')?.textContent).toContain('DE VUELTA');
    expect(el.querySelector('a.btn.pulse')?.getAttribute('href')).toBe('/juegos');
    expect(el.querySelector('a.magenta')?.getAttribute('href')).toBe('/login');
  });

  it('los elementos decorativos (siluetas y flecha de scroll) están ocultos', async () => {
    const el = await render();
    expect(el.querySelector('.home-silos')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.hero-scroll')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('monta todas las secciones en orden', async () => {
    const el = await render();
    const tags = Array.from(el.querySelector('.home')!.children).map((c) =>
      c.tagName.toLowerCase(),
    );
    expect(tags).toEqual([
      'section',
      'app-features-section',
      'app-games-section',
      'app-stats-section',
      'app-activity-section',
      'app-pricing-section',
      'app-final-cta-section',
    ]);
  });
});
