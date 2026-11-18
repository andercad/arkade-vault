# SPEC space-invaders-01 — Space Invaders: formación alienígena, escudos y UFO (motor, registro, migración y portada)

> **Estado:** Borrador
> **Depende de:** SPEC 01 (reproductor y modal), SPEC 04 (migraciones de Supabase), SPEC 05 (Asteroids, patrón de motor), SPEC 06 (tablas `games` y `scores`, `submitScore`), SPEC 07 (registro genérico de juegos), SPEC 09 (Snake, patrón de motor con pasos), SPEC 12 (mando táctil), SPEC 13 (Gamepad MK-II), game-jam/frogger/02-frogger-platform (migración 0008)
> **Fecha:** 2026-11-18
> **Objetivo:** Crear el motor TypeScript `lib/space-invaders/` con `createSpaceInvadersGame` (cañón fijo en el suelo contra una formación alienígena de 5×10 con escudos destructibles y UFO bonus), registrarlo como juego real `space-invaders` con fila en `games`, portada y mando táctil.

## Por qué existe esta spec

Tema de la game jam: SPACE INVADERS (fila sugerida en `references/game-suggestions-todo.md`: SHOOTER, green, "Destruye la formación alienígena con escudos y UFO bonus"). Es un juego nuevo: no hay código en `references/started-games/`.

Se diferencia de Asteroids (nave libre con inercia y campo móvil) en que aquí la amenaza es una **formación en rejilla que marcha por pasos discretos**, acelera al perder miembros y baja una fila al tocar el borde; el jugador solo se mueve en horizontal y dispara con un único proyectil en vuelo. La tensión nace de los escudos que se erosionan y del UFO que cruza arriba.

Es un juego **original en arte y números**: mecánica clásica del género, pero sprites dibujados con primitivas de canvas (sin copiar bitmaps ni tablas de un título concreto) y valores de diseño decididos aquí.

El registro genérico (`lib/game-registry.ts`) ya existe desde la SPEC 07; esta spec solo añade una entrada. Comprobado hoy: `cat` `SHOOTER` y `color` `green` **ya están soportados** por el CHECK de `0003_games_scores.sql`, por `Category`/`AccentColor` en `lib/games.ts` y por el CSS de acentos; no hace falta el paso "Categoría o color nuevo". La clase `.cover-invaders` que ya existe en `app/globals.css` pertenece a la maqueta y no se reutiliza: esta spec crea `.cover-space-invaders`.

## Alcance

**Dentro:**

- Motor en `lib/space-invaders/` con `createSpaceInvadersGame`: diseño nuevo, sin globales, DOM ni `localStorage`.
  - Canvas lógico 600×640: franja de HUD de 40 px arriba y campo de juego de 600×600.
  - Formación de 5 filas × 10 columnas que marcha por pasos, con tres tipos visuales (calamar, cangrejo, pulpo) dibujados con primitivas.
  - Cañón del jugador con movimiento horizontal y **un solo disparo en vuelo**.
  - Disparos alienígenas (máx. 3 a la vez) lanzados desde el invasor más bajo de una columna.
  - 4 escudos destructibles de celdas (erosión por balas del jugador, de los invasores y por contacto con la formación).
  - UFO bonus que cruza la franja superior periódicamente.
  - 3 vidas, reaparición con invulnerabilidad, vida extra por puntos, oleadas sucesivas (nivel) con dificultad creciente por parámetros.
  - HUD propio del canvas: PUNTOS, VIDAS (iconos de cañón) y NIVEL.
- Fila `space-invaders` en `games` por migración `0009_seed_space-invaders.sql`; portada `.cover-space-invaders`.
- Entrada en `lib/game-registry.ts` (600×640, sin opciones, adaptador con `hud` Vidas y Nivel) con `touchControls`.
- HUD de plataforma: Jugador, Puntuación, Vidas, Nivel.
- Pausa por botón y por `Esc`/`P`, FIN, game over, "JUGAR DE NUEVO", guardado con `submitScore`.
- Añadir las specs de `space-invaders` a `CLAUDE.md`, `README.md` y la fila a `references/implemented-games.md` en el mismo cambio (al implementar).

**Fuera de alcance (specs futuras):**

- Formaciones distintas por nivel, invasores con varios impactos y jefe (spec 02).
- Skins, sonido y opciones de plataforma (spec 03).
- Sprites externos en `public/games/`, partículas y animaciones elaboradas más allá de la explosión simple de 2 frames.
- Controles táctiles más allá del `touchControls` del registro, gestos sobre el canvas, pantalla completa.
- Supabase Auth, anti-trampa, cambios de esquema en `games`/`scores`, otros juegos, tests automatizados.

## Modelo de datos

```ts
// lib/space-invaders/types.ts
export type SpaceInvadersStatus = "playing" | "paused" | "gameover";

export interface SpaceInvadersSnapshot {
  score: number;
  lives: number; // 0..5
  level: number; // 1+
  status: SpaceInvadersStatus;
}

export interface SpaceInvadersCallbacks {
  onState(s: SpaceInvadersSnapshot): void; // solo cuando cambia un campo
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface SpaceInvadersGame {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // 0 puntos, 3 vidas, nivel 1
  end(): void; // termina con la puntuación actual
  destroy(): void;
}

export function createSpaceInvadersGame(
  canvas: HTMLCanvasElement,
  callbacks: SpaceInvadersCallbacks,
): SpaceInvadersGame;

// lib/space-invaders/entities.ts
export interface Invader {
  col: number; // 0..9
  row: number; // 0..4
  alive: boolean;
}
export interface Bullet {
  x: number;
  y: number;
  vy: number; // negativa = jugador, positiva = invasor
}
export interface Shield {
  x: number; // esquina superior izquierda en px
  y: number;
  cells: boolean[][]; // [fila][columna], true = intacta
}
export interface Ufo {
  x: number;
  dir: 1 | -1;
  points: number; // fijado al aparecer
}
```

```sql
-- supabase/migrations/0009_seed_space-invaders.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'space-invaders',
  'SPACE INVADERS',
  'Frena la invasión y protege los escudos.',
  'Mueve el cañón por el suelo y destruye la formación alienígena antes de que llegue abajo, usando los escudos como cobertura. Caza el UFO que cruza arriba para ganar puntos extra.',
  'SHOOTER',
  'cover-space-invaders',
  'green',
  6
);
```

Estructura de archivos nueva:

```
lib/space-invaders/constants.ts  // dimensiones, velocidades, formación, escudos, UFO, vidas
lib/space-invaders/types.ts
lib/space-invaders/utils.ts      // stepInterval(alive, level), rectsOverlap, ufoPoints(shots), createShields, erodeShield
lib/space-invaders/entities.ts   // Invader, Bullet, Shield, Ufo y sus fábricas
lib/space-invaders/engine.ts     // createSpaceInvadersGame
supabase/migrations/0009_seed_space-invaders.sql
```

Convenciones del juego (valores de diseño nuevo, decididos aquí):

- Coordenadas en píxeles lógicos con origen arriba a la izquierda; el campo de juego empieza en `y = 40` (franja de HUD). `W = 600`, `H = 640`, `HUD_H = 40`.
- **Formación:** `COLS = 10`, `ROWS = 5`, separación `44 × 36` px, sprite de invasor `32 × 22` px. Origen inicial `(86, 90)` del invasor `(0,0)`; en cada nivel `y0 = 90 + 16 × min(level − 1, 4)` (las oleadas posteriores empiezan más abajo).
- **Marcha:** la formación se mueve `STEP_DX = 8` px cada `stepInterval` ms; al alcanzar el margen lateral de 20 px, el siguiente paso baja `STEP_DY = 20` px y cambia el sentido. `stepInterval = max(45, 11 × vivos) × max(0,6, 1 − 0,06 × (nivel − 1))` ms (50 vivos nivel 1 → 550 ms; 1 vivo → 45 ms). Acumulador de tiempo con `dt` máximo 0,05 s; cada paso alterna el frame de animación del sprite.
- **Fila → tipo y puntos:** fila 0 = calamar, 30 puntos; filas 1–2 = cangrejo, 20 puntos; filas 3–4 = pulpo, 10 puntos.
- **Cañón:** sprite `40 × 20` px en `y = 590` (base fija), velocidad `PLAYER_SPEED = 260` px/s, limitado a `[20, 580 − 40]` en x. Inicio centrado.
- **Disparo del jugador:** un proyectil `3 × 12` px a `PLAYER_BULLET_SPEED = 520` px/s hacia arriba. Solo puede haber uno en vuelo; mantener `Espacio` dispara de nuevo en cuanto el anterior desaparece (impacto o salir por `y < 40`).
- **Disparos alienígenas:** proyectiles `4 × 12` px a `min(320, 200 + 10 × nivel)` px/s. Máx. 3 en vuelo. Intervalo entre disparos aleatorio en `[0,5; 1,3] s` dividido por `1 + 0,1 × (nivel − 1)`. El tirador es el invasor vivo más bajo de una columna elegida al azar entre las que tienen invasores vivos. Se descartan al salir por `y > 640` o al impactar.
- **Escudos:** 4 bunkers de `66 × 48` px (rejilla de `11 × 8` celdas de 6 px, con muesca inferior central de 3 × 3 celdas y esquinas superiores recortadas) centrados en `x = 75, 225, 375, 525`, `y = 500`. Una bala que toca una celda intacta la elimina junto a sus 4 vecinas ortogonales y desaparece. Una celda tocada por el rectángulo de un invasor vivo se elimina sin afectar al invasor. Los escudos se regeneran completos al comenzar cada nivel y no al perder una vida.
- **UFO:** sprite `44 × 18` px en `y = 48`. Aparece cuando `ufoTimer` llega a 0, con `ufoTimer` aleatorio en `[18; 28] s` (primer valor al iniciar partida o nivel) y solo si hay al menos 8 invasores vivos; cruza a `UFO_SPEED = 110` px/s alternando sentido (empieza de izquierda a derecha). Se reinicia el temporizador al salir o al ser destruido. Valor al impactar: `UFO_POINTS[shotsFired % 8]` con `UFO_POINTS = [100, 50, 50, 100, 150, 100, 50, 300]`, donde `shotsFired` cuenta los disparos del jugador en la partida.
- **Colisiones:** AABB (`rectsOverlap`). La bala del jugador se evalúa contra UFO, invasores vivos y escudos; la alienígena contra cañón y escudos; la bala del jugador y la alienígena que se cruzan se anulan mutuamente.
- **Vidas:** `LIVES = 3`. Una bala alienígena que alcanza el cañón lo destruye: animación de explosión 1,0 s (formación, UFO y balas congelados), reaparición en el centro y **invulnerabilidad de 1,5 s** (parpadeo). Se vacían las balas alienígenas al reaparecer. Vida extra al llegar a 2.000 puntos y luego cada 5.000 (máximo 5 vidas).
- **Derrota inmediata:** si el borde inferior de cualquier invasor vivo alcanza `y ≥ 580` (línea del cañón), `lives` pasa a 0 y la partida termina, aunque queden vidas.
- **Oleada superada:** al destruir el último invasor, `+100` puntos, `level += 1`, pausa interna de 1,2 s sin entrada de disparo, nueva formación y escudos. No hay nivel final (partida sin fin).
- **Rango de puntuación:** una oleada completa de invasores vale 900 puntos (10 × 30 + 20 × 20 + 20 × 10) más 100 de bonus y el UFO (máx. 300 por aparición); muy por debajo de 1.000.000. `GamePlayer` ya acota al guardar.
- **Teclas (`event.code`):** `ArrowLeft`/`KeyA` mueve a la izquierda, `ArrowRight`/`KeyD` a la derecha, `Space` dispara (estado mantenido, no pulsación única), `Escape`/`KeyP` pausa (pulsación única, ignorando `event.repeat`, solo desde `playing`, constante `PAUSE_KEYS`). `preventDefault` sobre flechas, `W/A/S/D` y `Space` mientras el juego está montado, también en `keyup` de `Space`. Se ignoran eventos con `target` de tipo `input`, `textarea` o `select`. El motor **no filtra `isTrusted`** (el mando táctil emite eventos sintéticos).
- Se vacía el mapa de teclas al pausar, terminar, reiniciar, en el game over y en `blur` de la ventana. Las teclas pulsadas durante la pausa no actúan.
- Orden de eventos al perder la última vida o por invasión: `onState({ lives: 0, status: "gameover" })` y después `onGameOver(score)`, una sola vez.
- `Math.random` y el uso de `canvas` solo dentro de `createSpaceInvadersGame` (llamado desde `useEffect`).

Adaptador del registro (lo escribe el paso 6):

```ts
// lib/game-registry.ts (fragmento)
function spaceInvadersSnapshot(s: SpaceInvadersSnapshot): GameSnapshot {
  return {
    score: s.score,
    status: s.status,
    hud: [
      { key: "lives", label: "Vidas", value: "♥ ".repeat(s.lives).trim() },
      { key: "level", label: "Nivel", value: String(s.level).padStart(2, "0") },
    ],
  };
}
// touchControls: dpad { left: "ArrowLeft", right: "ArrowRight" }, actions [{ code: "Space", label: "DISPARO" }]
```

## Plan de implementación

1. **Lectura previa y constantes.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md); revisar `components/game-player.tsx`, `components/game-canvas.tsx`, `lib/game-registry.ts`, `lib/snake/engine.ts` (pasos por acumulador) y `lib/asteroids/engine.ts` (disparo y vidas) como patrón.
   - Crear `lib/space-invaders/constants.ts` (`W=600`, `H=640`, `HUD_H=40`, `COLS`, `ROWS`, separaciones, `STEP_DX`, `STEP_DY`, `PLAYER_SPEED`, `PLAYER_Y`, velocidades de balas, `LIVES=3`, `UFO_POINTS`, `PAUSE_KEYS`), `types.ts` y `utils.ts` (`stepInterval`, `rectsOverlap`, `ufoPoints`).
   - Verificación: `npx tsc --noEmit`.
2. **Entidades y escudos.**
   - Crear `lib/space-invaders/entities.ts`: fábricas de formación, balas, UFO y `createShields()`; `erodeShield(shield, hitCol, hitRow)` que elimina la celda y sus 4 vecinas.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los 4 escudos nacen con la forma de bunker (muesca inferior y esquinas recortadas).
3. **Motor: simulación.**
   - Crear `lib/space-invaders/engine.ts` (parte lógica): marcha de la formación con acumulador, descenso en bordes, disparo del jugador único, disparos alienígenas, colisiones, escudos, UFO, vidas con invulnerabilidad, vida extra, derrota por invasión, oleadas y puntuación.
   - Snapshot solo ante cambios (`score`, `lives`, `level`, `status`); `onGameOver` único tras emitir `lives = 0`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
4. **Motor: dibujo, input y ciclo de vida.**
   - `draw`: HUD del canvas (PUNTOS, VIDAS con iconos de cañón, NIVEL), fondo oscuro con estrellas fijas, invasores con 2 frames por tipo, escudos por celdas, cañón (parpadeo en invulnerabilidad, explosión al morir), UFO con su valor al destruirse durante 0,8 s, balas. El canvas no dibuja texto de pausa ni "GAME OVER".
   - Input en `window` registrado en `start()` con cleanup, `blur`, `preventDefault` selectivo, `start/pause/resume/restart/end/destroy`, `lastTime` reiniciado en `resume()` y bandera `destroyed` ante StrictMode.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; sin listeners tras `destroy()`.
5. **Registro del juego.**
   - Añadir `spaceInvaders` a `GAME_REGISTRY` en `lib/game-registry.ts` (600×640, `aria` "Space Invaders", sin opciones, adaptador con `hud` Vidas y Nivel, `touchControls` con `left`/`right` y botón `Space` "DISPARO").
   - Verificación: `npx tsc --noEmit` y `npm run lint`; los demás juegos no cambian; `/juegos/space-invaders/jugar` devuelve 404 hasta que el paso 6 inserte la fila.
6. **Migración seed.**
   - Crear `supabase/migrations/0009_seed_space-invaders.sql` y aplicarla con `apply_migration`; regenerar `lib/supabase/database.types.ts` si hace falta. Comprobar `select sort_order from games` y usar el siguiente libre si el 6 está ocupado (y reflejarlo aquí).
   - Verificación: `list_migrations`, `select id from games` incluye `space-invaders`, `get_advisors` (security) sin avisos críticos, y `/juegos/space-invaders/jugar` monta el canvas con formación, escudos y HUD.
7. **Portada y CSS.**
   - Añadir `.cover-space-invaders` en `app/globals.css` (aplicar `/frontend-design`: filas de invasores verdes sobre escudos y haz del cañón, distinguible de `.cover-invaders`, `.cover-asteroids` y `.cover-snake`) y comprobar el escalado del canvas 600×640.
   - Verificación: tarjeta en `/juegos`, `/juegos/space-invaders` con portada, 375 px sin desbordar.
8. **Verificación en navegador y documentación.**
   - Probar con Playwright (jugar, perder, guardar "TEST", ver leaderboard; emulación táctil 390×844 con el mando), borrar las filas de prueba de `scores` con `execute_sql`, y añadir las specs a `CLAUDE.md`, `README.md` y la fila a `references/implemented-games.md`.
   - Verificación: ambos mencionan la spec; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `space-invaders-NN: Paso N`. Para el diseño visual (portada, estados) aplicar `/frontend-design`, según `CLAUDE.md`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `supabase/migrations/0009_seed_space-invaders.sql` existe y figura en `list_migrations`; `games` contiene `space-invaders` (SHOOTER, `cover-space-invaders`, green, `sort_order` 6 o el siguiente libre) y `get_advisors` (security) no reporta avisos críticos.
- [ ] `/juegos` muestra la tarjeta SPACE INVADERS con su portada; `/juegos/space-invaders` carga y "JUGAR AHORA" lleva a `/juegos/space-invaders/jugar`.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings.
- [ ] Las flechas, `A/D` y `Espacio` no hacen scroll en la página mientras el juego está montado.
- [ ] `PAUSA`/`REANUDAR` congela y continúa; `Esc` y `P` hacen lo mismo; mantener pulsada la tecla no alterna; en game over no tienen efecto; el canvas no dibuja texto de pausa; el overlay "EN PAUSA" muestra la pista de teclas.
- [ ] Durante la pausa, mover o disparar no actúa, y al reanudar la formación no da varios pasos de golpe.
- [ ] `Espacio` con el foco en PAUSA/FIN no activa el botón.
- [ ] Perder la última vida, la invasión y FIN abren el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja "GAME OVER".
- [ ] "JUGAR DE NUEVO" reinicia a 0 puntos, 3 vidas, nivel 1, formación y escudos completos, sin teclas pegadas.
- [ ] Guardar con nombre "TEST" inserta una fila con `game_id = 'space-invaders'`; nombre vacío guarda `INVITADO`; se muestra "PUNTUACIÓN GUARDADA\_".
- [ ] La puntuación aparece en la ficha, en el Salón (tab SPACE INVADERS) y en la actividad de la home; la tarjeta muestra `best` y `plays` actualizados.
- [ ] "SALIR" y "VOLVER AL VAULT" no dejan listeners ni bucle activos.
- [ ] En desarrollo (StrictMode) hay una sola instancia y la formación marcha a velocidad normal.
- [ ] A 375 px de ancho el canvas se escala sin desbordar; el mando táctil solo aparece con `pointer: coarse`, muestra solo izquierda/derecha y el botón DISPARO, y soltar un botón no deja teclas pegadas.
- [ ] Asteroids, Tetris, Arkanoid, Snake y Frogger siguen funcionando igual; `references/` (salvo la fila nueva en `implemented-games.md`) no cambia.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Space Invaders:**

- [ ] Al iniciar: formación de 5×10 con el invasor `(0,0)` en `(86, 90)`, 4 escudos intactos, cañón centrado, HUD del canvas con PUNTOS 0, VIDAS 3 y NIVEL 1; el HUD de plataforma muestra Jugador, Puntuación 0, Vidas `♥ ♥ ♥` y Nivel 01.
- [ ] El cañón se mueve a 260 px/s con flechas o `A/D` y no sale del rango `[20, 540]`.
- [ ] Solo hay un disparo del jugador en vuelo; mantener `Espacio` dispara de nuevo al desaparecer el anterior.
- [ ] La formación avanza 8 px por paso con `stepInterval` según vivos (550 ms con 50, 45 ms con 1 en nivel 1), baja 20 px y cambia de sentido en el borde.
- [ ] Destruir un invasor suma 30 (fila 0), 20 (filas 1–2) o 10 (filas 3–4).
- [ ] Nunca hay más de 3 disparos alienígenas simultáneos y siempre salen del invasor más bajo de su columna.
- [ ] Las balas (propias y enemigas) y el contacto de la formación erosionan las celdas de los escudos; los escudos no se regeneran al perder una vida y sí al pasar de nivel.
- [ ] El UFO aparece entre 18 y 28 s tras iniciar nivel o salir el anterior, solo con ≥ 8 invasores vivos, alterna el sentido y otorga `UFO_POINTS[shotsFired % 8]`.
- [ ] Una bala enemiga que alcanza el cañón quita una vida, dispara la explosión de 1,0 s y da 1,5 s de invulnerabilidad tras reaparecer.
- [ ] Un invasor que llega a `y ≥ 580` termina la partida con `lives = 0` aunque quedaran vidas.
- [ ] Vida extra a 2.000 puntos y luego cada 5.000, máximo 5 vidas.
- [ ] Destruir todos los invasores suma 100, sube el nivel, regenera formación (más abajo hasta el nivel 5) y escudos, y acelera marcha y disparos.
- [ ] Al perder la última vida se emite `lives = 0` y después `onGameOver(score)` una sola vez.

## Decisiones

- **Sí:** diseño original con la mecánica clásica del género (formación en pasos, escudos erosionables, UFO), sin bitmaps ni tablas de un título concreto. Sprites con primitivas de canvas.
- **Sí:** `cat` SHOOTER y `color` green: ya soportados por BD, `lib/games.ts` y CSS, así que no hay paso de ampliación de CHECK. La portada `cover-space-invaders` lo distingue de Snake y Frogger (también green).
- **Sí:** `sort_order` 6 y migración `0009`, siguientes libres tras Frogger (0008, orden 5); el implementador comprueba `select sort_order from games`.
- **Sí:** 3 vidas, además de la derrota inmediata por invasión. Razón: mecánica original del género; las vidas dan margen para aprender los patrones de disparo, y la invasión conserva la presión de no dejar que la formación baje (1 vida sería demasiado punitivo, más de 3 diluiría el riesgo de los escudos).
- **Sí:** snapshot con `lives = 0` siempre antes de `onGameOver(score)`, y `lives` presente en `hud` como item `lives`.
- **Sí:** HUD doble: HUD interno del canvas (PUNTOS, VIDAS, NIVEL) y HUD de plataforma de `GamePlayer` (Jugador, Puntuación + `snapshot.hud` con Vidas y Nivel). Razón: coherencia con los demás juegos y legibilidad al escalar.
- **Sí:** un único disparo del jugador en vuelo. Razón: define el ritmo del género y se verifica fácil; sin spam de balas.
- **Sí:** marcha por acumulador con `dt` máximo 0,05 s y `lastTime` reiniciado en `resume()`. Con pasos de 8 px no hay riesgo de atravesar escudos; las balas (520 px/s × 0,05 s = 26 px) son más cortas que el alto de una celda de invasor, pero el barrido se evalúa por trayectoria del frame para no tunelar.
- **Sí:** el mando táctil: d-pad con izquierda/derecha y un botón `Space` "DISPARO" (SPEC 12/13); el motor lee `e.code` y no filtra `isTrusted`.
- **Sí:** niveles solo por parámetros (velocidad, fuego, altura inicial). Razón: núcleo mínimo jugable; patrones por nivel y jefe van en spec 02.
- **Sí:** dibujo con primitivas y un fondo con estrellas fijas generadas en `createSpaceInvadersGame` (no en render de React).
- **No:** skins, sonido, selector de nivel y récords en `localStorage`. Razón: specs 02 y 03.
- **No:** `devicePixelRatio`; canvas lógico 600×640 escalado por CSS como los demás juegos.
- **No:** reutilizar `.cover-invaders` de la maqueta. Razón: la portada del juego real debe ser propia y no acoplarse a la maqueta.

## Riesgos

| Riesgo                                                      | Mitigación                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| StrictMode duplica bucle y listeners                        | `destroy()` cancela rAF y quita listeners; bandera `destroyed`; criterio de una instancia                            |
| `Math.random` o `canvas` rompen el render en servidor       | Todo dentro de `createSpaceInvadersGame`, llamado solo desde `useEffect`; React renderiza el `<canvas>` vacío        |
| Teclas pegadas al pausar, perder foco o soltar el mando     | Vaciar el mapa de teclas al pausar, terminar, reiniciar y en `blur`; entrada ignorada en pausa y game over           |
| Motor filtra `isTrusted` e ignora el mando táctil           | Leer solo `e.code`; criterio de aceptación táctil                                                                    |
| Balas atraviesan celdas de escudo o invasores a `dt` grande | `dt` ≤ 0,05 s y detección por rectángulo barrido del frame (de `y` anterior a `y` actual)                            |
| Con pocos invasores el juego es injugable por velocidad     | Suelo `stepInterval ≥ 45 ms` y paso fijo de 8 px                                                                     |
| Foco en un botón intercepta `Espacio`                       | `preventDefault` en `keydown` y `keyup` de `Space`; ignorar `target` input/textarea/select                           |
| `sort_order` 6 o `0009` ocupados cuando se implemente       | Comprobar `select sort_order from games` y `list_migrations` en el paso 6; usar el siguiente libre y reflejarlo aquí |
| Regresión en los demás juegos al editar el registro         | Solo se añade una entrada; criterio de que los demás siguen igual                                                    |
| Datos de prueba quedan en la BD                             | Paso 8 borra `scores`; criterio "las filas de prueba están borradas"                                                 |

## Qué **no** está en esta spec

- Formaciones por nivel, invasores resistentes y jefe (spec 02).
- Skins, sonido y opciones de plataforma (spec 03).
- Sprites externos, partículas y animaciones elaboradas.
- Gestos sobre el canvas y pantalla completa.
- Supabase Auth, anti-trampa, cambios de esquema en `games`/`scores` y otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
