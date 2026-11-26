import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let http: HttpTestingController;
  const MSG = { name: 'Kai', email: 'kai@vault.gg', message: 'Hola', website: '' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('hace POST a /api/contact con el cuerpo y completa en éxito', () => {
    let done = false;
    service.send(MSG).subscribe({ complete: () => (done = true) });
    const req = http.expectOne('/api/contact');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(MSG);
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('propaga el error del servidor', () => {
    let status = 0;
    service.send(MSG).subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/contact').flush({ error: 'x' }, { status: 500, statusText: 'Error' });
    expect(status).toBe(500);
  });
});
