import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crea la app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('pinta fondo, logo, main y footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.av-bg')).toBeTruthy();
    expect(el.querySelector('.av-noise')).toBeTruthy();
    expect(el.querySelector('.av-nav .logo-text')?.textContent).toContain('VAULT');
    expect(el.querySelector('main.av-main')).toBeTruthy();
    expect(el.querySelector('footer')?.textContent).toContain('ARCADE VAULT');
  });
});
