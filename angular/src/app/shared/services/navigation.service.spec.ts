import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  it('asigna la URL en la ventana del documento', () => {
    const assign = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { location: { assign } } } }],
    });
    TestBed.inject(NavigationService).assign('/');
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('sin ventana (servidor) no hace nada', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    expect(() => TestBed.inject(NavigationService).assign('/')).not.toThrow();
  });
});
