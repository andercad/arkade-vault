import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type Route, type UrlSegment } from '@angular/router';
import type { SessionUser } from '@shared/models/session';
import { SessionService } from '@shared/services/session.service';
import { guestGuard } from './guest.guard';

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
  TestBed.runInInjectionContext(() => guestGuard({} as Route, [] as UrlSegment[], {} as never));

describe('guestGuard', () => {
  it('sin sesión permite', async () => {
    setup(null);
    expect(await run()).toBe(true);
  });

  it('con sesión redirige a /', async () => {
    setup(USER);
    const result = (await run()) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/');
  });
});
