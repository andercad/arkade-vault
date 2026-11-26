import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type Route, type UrlSegment } from '@angular/router';
import type { SessionUser } from '@shared/models/session';
import { SessionService } from '@shared/services/session.service';
import { authGuard } from './auth.guard';

const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

function setup(user: SessionUser | null, loaded: Promise<void> = Promise.resolve()) {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SessionService,
        useValue: { user: signal(user).asReadonly(), whenLoaded: () => loaded },
      },
    ],
  });
}

const run = () =>
  TestBed.runInInjectionContext(() => authGuard({} as Route, [] as UrlSegment[], {} as never));

describe('authGuard', () => {
  it('con sesión permite', async () => {
    setup(USER);
    expect(await run()).toBe(true);
  });

  it('sin sesión redirige a /login', async () => {
    setup(null);
    const result = (await run()) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
  });

  it('espera a que termine la carga de la sesión', async () => {
    let release!: () => void;
    setup(USER, new Promise<void>((resolve) => (release = resolve)));
    let settled = false;
    const result = Promise.resolve(run()).then((r) => ((settled = true), r));
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    expect(await result).toBe(true);
  });
});
