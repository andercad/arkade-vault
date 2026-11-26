import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import type { Game } from '@/lib/games';
import type { ScoreRow } from '@/lib/scores';
import { DataErrorComponent } from '@shared/components/data-error/data-error';
import { LoadingComponent } from '@shared/components/loading/loading';
import { ScoreEmptyComponent } from '@shared/components/score-empty/score-empty';
import { GamesService } from '@shared/services/games.service';
import { formatScore } from '@shared/utils/format';
import { PodiumSlotComponent } from '../../components/podium-slot/podium-slot';

/** Filas del ranking de cada pestaña. */
const TOP_LIMIT = 12;
/** Retardo de entrada entre filas de la tabla, en ms. */
const ROW_STEP_MS = 50;

/** Ranking de un juego por id; `null` = falló la lectura de ese ranking. */
type Rankings = Record<string, ScoreRow[] | null>;

/**
 * Ruta `/salon-de-la-fama`: una pestaña por juego (patrón ARIA *tabs*), podio top 3 y tabla
 * top 12. `?juego=<id>` elige la pestaña inicial (desconocido → la primera). Carga el catálogo
 * y un ranking por juego en paralelo; el fallo de un ranking solo afecta a su pestaña.
 */
@Component({
  selector: 'app-hall-of-fame-page',
  imports: [
    RouterLink,
    DataErrorComponent,
    LoadingComponent,
    PodiumSlotComponent,
    ScoreEmptyComponent,
  ],
  templateUrl: './hall-of-fame-page.html',
  styleUrl: './hall-of-fame-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'av-hall fade-in' },
})
export default class HallOfFamePageComponent {
  private readonly gamesService = inject(GamesService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // ========== Inputs ==========
  /** Query param `?juego=` (binding de la ruta). */
  readonly juego = input<string>();

  // ========== State ==========
  protected readonly games = rxResource({ stream: () => this.gamesService.getGames() });
  protected readonly rankings = rxResource({
    params: () => (this.games.value()?.length ? this.games.value() : undefined),
    stream: ({ params }) => this.loadRankings(params),
  });
  /** Id de la pestaña activa; se reinicia si cambian los juegos o `?juego=`. */
  protected readonly activeId = linkedSignal<
    { games: Game[] | undefined; juego: string | undefined },
    string | undefined
  >({
    source: () => ({ games: this.games.value(), juego: this.juego() }),
    computation: ({ games, juego }) => games?.find((g) => g.id === juego)?.id ?? games?.[0]?.id,
  });

  // ========== Computed ==========
  protected readonly gameList = computed(() => this.games.value() ?? []);
  protected readonly active = computed(() => this.gameList().find((g) => g.id === this.activeId()));
  /** `null` = error al leer el ranking de la pestaña activa. */
  protected readonly rows = computed<ScoreRow[] | null>(() => {
    const id = this.activeId();
    const rankings = this.rankings.value();
    if (!id || !rankings) return [];
    return rankings[id] ?? null;
  });
  protected readonly slots = computed(() => {
    const rows = this.rows() ?? [];
    return [
      { row: rows[1], place: '02', medal: 'silver' },
      { row: rows[0], place: '01', medal: 'gold' },
      { row: rows[2], place: '03', medal: 'bronze' },
    ] as const;
  });
  protected readonly items = computed(() =>
    (this.rows() ?? []).map((r, i) => ({
      key: r.rank,
      cls: 'tr' + (i < 3 ? ` top${i + 1}` : ''),
      rank: String(r.rank).padStart(2, '0'),
      name: r.name,
      score: formatScore(r.score),
      date: r.date,
      delay: i * ROW_STEP_MS,
    })),
  );

  // ========== Event handlers ==========
  /** Teclado de la lista de pestañas: flechas (circular), `Home` y `End`. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const games = this.gameList();
    const current = games.findIndex((g) => g.id === this.activeId());
    const last = games.length - 1;
    const next = {
      ArrowRight: current >= last ? 0 : current + 1,
      ArrowLeft: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.activeId.set(games[next].id);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }

  // ========== Private ==========
  private loadRankings(games: Game[]) {
    return forkJoin(
      games.map((g) =>
        this.gamesService.getTopScores(g.id, TOP_LIMIT).pipe(
          catchError(() => of(null)),
          map((rows) => [g.id, rows] as const),
        ),
      ),
    ).pipe(map((entries): Rankings => Object.fromEntries(entries)));
  }
}
