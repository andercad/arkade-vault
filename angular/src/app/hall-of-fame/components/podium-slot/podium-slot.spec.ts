import { TestBed } from '@angular/core/testing';
import type { ScoreRow } from '@/lib/scores';
import { PodiumSlotComponent } from './podium-slot';

const ROW: ScoreRow = { rank: 1, name: 'ANA', score: 12345, date: '05/01/2026' };

describe('PodiumSlotComponent', () => {
  function render(
    place: '01' | '02' | '03',
    medal: 'gold' | 'silver' | 'bronze',
    row?: ScoreRow,
  ): HTMLElement {
    const fixture = TestBed.createComponent(PodiumSlotComponent);
    fixture.componentRef.setInput('place', place);
    fixture.componentRef.setInput('medal', medal);
    if (row) fixture.componentRef.setInput('row', row);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('el host lleva podium-slot y la medalla', () => {
    const el = render('02', 'silver', ROW);
    expect(el.classList.contains('podium-slot')).toBe(true);
    expect(el.classList.contains('silver')).toBe(true);
  });

  it('pinta puesto, nombre, puntos formateados y fecha', () => {
    const el = render('02', 'silver', ROW);
    expect(el.querySelector('.rank-num')?.textContent).toBe('02');
    expect(el.querySelector('.name')?.textContent).toBe('ANA');
    expect(el.querySelector('.score')?.textContent).toBe('12.345');
    expect(el.querySelector('.date')?.textContent).toBe('05/01/2026');
  });

  it('solo el primer puesto lleva CAMPEÓN y tipografía mayor', () => {
    const gold = render('01', 'gold', ROW);
    expect(gold.querySelector('.champion-label')?.textContent).toBe('CAMPEÓN');
    expect(gold.querySelector('.rank-num')?.classList.contains('champion-rank')).toBe(true);
    expect(gold.querySelector('.score')?.classList.contains('champion-score')).toBe(true);

    const bronze = render('03', 'bronze', ROW);
    expect(bronze.querySelector('.champion-label')).toBeNull();
    expect(bronze.querySelector('.rank-num')?.classList.contains('champion-rank')).toBe(false);
  });

  it('sin fila muestra marcadores y fecha vacía', () => {
    const el = render('03', 'bronze');
    expect(el.querySelector('.name')?.textContent).toBe('---');
    expect(el.querySelector('.score')?.textContent).toBe('------');
    expect(el.querySelector('.date')?.textContent).toBe('');
  });
});
