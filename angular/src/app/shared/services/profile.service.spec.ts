import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;
  const refresh = vi.fn();

  beforeEach(() => {
    refresh.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { refresh } },
      ],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('updateUsername hace PATCH, refresca la sesión y devuelve el nombre', async () => {
    let name = '';
    service.updateUsername('nuevo').subscribe((n) => (name = n));
    const req = http.expectOne('/api/profile/username');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ username: 'nuevo' });
    req.flush({ name: 'NUEVO' });
    await vi.waitFor(() => expect(name).toBe('NUEVO'));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('updateUsername propaga el error sin refrescar', () => {
    let status = 0;
    service.updateUsername('x').subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/profile/username').flush({ error: 'dup' }, { status: 409, statusText: 'C' });
    expect(status).toBe(409);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('changePassword hace POST con current, password y repeat', () => {
    const input = { current: 'a', password: 'b', repeat: 'b' };
    let done = false;
    service.changePassword(input).subscribe(() => (done = true));
    const req = http.expectOne('/api/profile/password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('changePassword propaga el error', () => {
    let status = 0;
    service
      .changePassword({ current: 'a', password: 'b', repeat: 'b' })
      .subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/profile/password').flush({ error: 'x' }, { status: 401, statusText: 'U' });
    expect(status).toBe(401);
  });

  it('deleteAccount hace DELETE con la confirmación en el cuerpo', () => {
    let done = false;
    service.deleteAccount('ANA').subscribe(() => (done = true));
    const req = http.expectOne('/api/profile');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ confirm: 'ANA' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('deleteAccount propaga el error', () => {
    let status = 0;
    service.deleteAccount('X').subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/profile').flush({ error: 'x' }, { status: 400, statusText: 'B' });
    expect(status).toBe(400);
  });
});
