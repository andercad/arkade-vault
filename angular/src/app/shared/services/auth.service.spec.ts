import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  let service: AuthService;
  const refresh = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    refresh.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { refresh } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  it('signUp hace POST /api/auth/sign-up y devuelve needsConfirmation', () => {
    const input = { username: 'px_kai', email: 'kai@vault.gg', password: 'Aa1!aaaa' };
    let result: unknown;
    service.signUp(input).subscribe((r) => (result = r));
    const req = http.expectOne('/api/auth/sign-up');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ needsConfirmation: true, email: 'kai@vault.gg' });
    expect(result).toEqual({ needsConfirmation: true, email: 'kai@vault.gg' });
  });

  it('signIn hace POST /api/auth/sign-in', () => {
    service.signIn({ identifier: 'px_kai', password: 'x' }).subscribe();
    const req = http.expectOne('/api/auth/sign-in');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'px_kai', password: 'x' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('signIn propaga el error del servidor', () => {
    let status = 0;
    service.signIn({ identifier: 'a', password: 'b' }).subscribe({
      error: (e: { status: number }) => (status = e.status),
    });
    http
      .expectOne('/api/auth/sign-in')
      .flush({ error: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
  });

  it('signOut hace POST /api/auth/sign-out y refresca la sesión', async () => {
    const done = new Promise<void>((resolve) => service.signOut().subscribe(() => resolve()));
    http.expectOne('/api/auth/sign-out').flush(null, { status: 204, statusText: 'No Content' });
    await done;
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
