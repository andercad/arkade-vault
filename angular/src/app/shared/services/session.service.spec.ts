import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, REQUEST_CONTEXT, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SessionUser } from '@shared/models/session';
import { SessionService } from './session.service';

const KEY = makeStateKey<SessionUser | null>('session-user');
const USER: SessionUser = { id: 'u1', name: 'ANDER', avatarUrl: null, hasPassword: true };

function setup(platform: 'server' | 'browser', extra: object[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platform },
      ...extra,
    ],
  });
}

describe('SessionService', () => {
  it('servidor: lee REQUEST_CONTEXT y lo vuelca en TransferState', () => {
    setup('server', [{ provide: REQUEST_CONTEXT, useValue: { user: USER } }]);
    const service = TestBed.inject(SessionService);
    expect(service.user()).toEqual(USER);
    expect(service.loading()).toBe(false);
    expect(TestBed.inject(TransferState).get(KEY, null)).toEqual(USER);
  });

  it('servidor sin contexto: invitado', () => {
    setup('server');
    const service = TestBed.inject(SessionService);
    expect(service.user()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('navegador: recupera el usuario de TransferState sin llamar a /api/auth/me', () => {
    setup('browser');
    TestBed.inject(TransferState).set(KEY, USER);
    const service = TestBed.inject(SessionService);
    expect(service.user()).toEqual(USER);
    expect(service.loading()).toBe(false);
    TestBed.inject(HttpTestingController).expectNone('/api/auth/me');
  });

  it('navegador sin TransferState: llama a /api/auth/me', async () => {
    setup('browser');
    const service = TestBed.inject(SessionService);
    expect(service.loading()).toBe(true);
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush({ user: USER });
    await service.whenLoaded();
    expect(service.user()).toEqual(USER);
    expect(service.loading()).toBe(false);
  });

  it('refresh() relee la sesión y un error deja al invitado', async () => {
    setup('browser');
    TestBed.inject(TransferState).set(KEY, USER);
    const service = TestBed.inject(SessionService);
    const http = TestBed.inject(HttpTestingController);

    const refreshed = service.refresh();
    expect(service.loading()).toBe(true);
    http.expectOne('/api/auth/me').flush('x', { status: 500, statusText: 'err' });
    await refreshed;
    expect(service.user()).toBeNull();
    expect(service.loading()).toBe(false);
  });
});
