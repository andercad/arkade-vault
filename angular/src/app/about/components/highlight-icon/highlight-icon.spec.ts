import { TestBed } from '@angular/core/testing';
import { HighlightIconComponent, type HighlightIconKind } from './highlight-icon';

describe('HighlightIconComponent', () => {
  function render(kind: HighlightIconKind): HTMLElement {
    const fixture = TestBed.createComponent(HighlightIconComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each<HighlightIconKind>(['HEART', 'BROWSER', 'PLANT'])(
    '%s pinta un único svg decorativo',
    (kind) => {
      const svgs = render(kind).querySelectorAll('svg.hl-icon');
      expect(svgs.length).toBe(1);
      expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('cada tipo dibuja un icono distinto', () => {
    const shapes = (['HEART', 'BROWSER', 'PLANT'] as const).map(
      (k) => render(k).querySelector('g')?.innerHTML,
    );
    expect(new Set(shapes).size).toBe(3);
  });
});
