import { TestBed } from '@angular/core/testing';
import type { FeatureIconKind } from '@/lib/home';
import { FeatureIconComponent } from './feature-icon';

describe('FeatureIconComponent', () => {
  function render(kind: FeatureIconKind): HTMLElement {
    const fixture = TestBed.createComponent(FeatureIconComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each<FeatureIconKind>(['GAMEPAD', 'FREE', 'TROPHY', 'ROCKET'])(
    '%s pinta un único svg decorativo',
    (kind) => {
      const svgs = render(kind).querySelectorAll('svg.ft-icon');
      expect(svgs.length).toBe(1);
      expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('cada tipo dibuja un icono distinto', () => {
    const shapes = (['GAMEPAD', 'FREE', 'TROPHY', 'ROCKET'] as const).map(
      (k) => render(k).querySelector('g')?.innerHTML,
    );
    expect(new Set(shapes).size).toBe(4);
  });
});
