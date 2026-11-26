import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NavComponent } from './nav';

@Component({ template: '' })
class DummyComponent {}

describe('NavComponent', () => {
  let fixture: ComponentFixture<NavComponent>;
  let el: HTMLElement;
  let router: Router;

  const routes = ['', 'juegos', 'juegos/:id', 'salon-de-la-fama', 'about', 'login'].map((path) => ({
    path,
    component: DummyComponent,
  }));

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const active = (scope: string) =>
    Array.from(el.querySelectorAll(`${scope} a.active`)).map((a) => a.textContent?.trim());
  const panel = () => el.querySelector('#mobile-panel') as HTMLElement;
  const burger = () => el.querySelector('button.hamburger') as HTMLButtonElement;

  it('pinta logo, enlaces, créditos y botón de sesión', () => {
    expect(el.querySelector('.logo-text')?.textContent).toContain('VAULT');
    const labels = Array.from(el.querySelectorAll('.links a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Inicio', 'Biblioteca', 'Salón de la Fama', 'Acerca de']);
    expect(el.querySelector('.coin-counter')?.textContent).toContain('CRÉDITOS · 03');
    expect(el.querySelector('a.auth-btn')?.getAttribute('href')).toBe('/login');
  });

  it('marca Inicio solo en la raíz', async () => {
    await go('/');
    expect(active('.links')).toEqual(['Inicio']);
    await go('/about');
    expect(active('.links')).toEqual(['Acerca de']);
  });

  it('marca Biblioteca también en las subrutas de /juegos', async () => {
    await go('/juegos/snake');
    expect(active('.links')).toEqual(['Biblioteca']);
  });

  it('ignora query params para el estado activo y expone aria-current', async () => {
    await go('/salon-de-la-fama?juego=snake');
    expect(active('.links')).toEqual(['Salón de la Fama']);
    expect(el.querySelector('.links a.active')?.getAttribute('aria-current')).toBe('page');
  });

  it('marca Iniciar Sesión del panel en /login', async () => {
    await go('/login');
    expect(active('.av-mobile-panel')).toEqual(['Iniciar Sesión']);
  });

  it('el panel empieza cerrado e inerte', () => {
    expect(panel().classList.contains('open')).toBe(false);
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(burger().getAttribute('aria-expanded')).toBe('false');
    expect(burger().getAttribute('aria-controls')).toBe('mobile-panel');
  });

  it('la hamburguesa abre el panel y el foco pasa a su primer enlace', async () => {
    burger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel().classList.contains('open')).toBe(true);
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(burger().getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.av-mobile-backdrop')?.classList.contains('open')).toBe(true);
    expect(document.activeElement).toBe(panel().querySelector('a'));
  });

  async function openPanel(): Promise<void> {
    burger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('Esc cierra el panel y devuelve el foco a la hamburguesa', async () => {
    await openPanel();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(panel().classList.contains('open')).toBe(false);
    expect(burger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(burger());
  });

  it('el backdrop cierra el panel', async () => {
    await openPanel();
    (el.querySelector('.av-mobile-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(panel().classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(burger());
  });

  it('pulsar un enlace del panel lo cierra', async () => {
    await openPanel();
    (panel().querySelector('a:nth-of-type(2)') as HTMLElement).click();
    fixture.detectChanges();
    expect(panel().classList.contains('open')).toBe(false);
  });

  it('Esc con el panel cerrado no mueve el foco', () => {
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
