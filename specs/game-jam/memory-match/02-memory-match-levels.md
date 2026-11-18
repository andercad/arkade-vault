# SPEC memory-match-02 — Memory: niveles con tableros crecientes y nivel inicial

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 08 (patrón `lib/arkanoid/levels.ts`), memory-match-01
> **Fecha:** 2026-11-18
> **Objetivo:** Añadir a Memory un sistema de niveles con tableros cada vez mayores y menos tiempo relativo, más la opción "Nivel inicial" (`restart`), para que la partida continúe tras limpiar el tablero.

---

## Por qué existe esta spec

El spec core termina la partida al emparejar los 8 pares de un único tablero 4×4: la partida dura menos de un minuto y el techo de puntuación es 3000. Para alargar la rejugabilidad y dar dificultad progresiva, al limpiar un tablero se pasa al siguiente nivel con más cartas, siguiendo el patrón de `lib/arkanoid/levels.ts` (tabla de niveles) y la opción `startLevel` con `appliesOn: "restart"` de Tetris.

Esta spec modifica el motor del core (`engine.ts`, `utils.ts`, `symbols.ts`) y el adaptador del registro; no toca portada, migraciones ni color.

---

## Alcance

**Dentro:**

- Tabla de niveles en `lib/memory-match/levels.ts` con columnas, filas, tiempo y símbolos por nivel; el nivel 5 en adelante repite el tablero 6×6.
- Al emparejar todo el tablero: bonus de fin de nivel, banner "NIVEL N" de 900 ms dibujado en el canvas y nuevo tablero; la partida solo termina por tiempo agotado o por FIN.
- Multiplicador de puntuación por nivel (tope ×10).
- Diseño del tablero dinámico (`boardLayout(cols, rows)`): celdas cuadradas centradas en el área de 600×600.
- Ampliar `SYMBOLS` de 8 a 18 símbolos.
- `level` en el snapshot, item `level` en el HUD de plataforma y valor en el HUD del canvas.
- Opción `startLevel` ("Nivel inicial", 1–5, `appliesOn: "restart"`) en el registro y `setStartLevel` en el motor.

**Fuera de alcance (specs futuras):**

- Sonido, skins, animaciones elaboradas de transición, cartas trampa o comodines.
- Modo a dos jugadores, selección con ratón, gestos sobre el canvas.
- Controles táctiles/mobile más allá del `touchControls` ya registrado, Supabase Auth.
- Cambios de esquema en `games`/`scores`, tests automatizados.

---

## Modelo de datos

```ts
// lib/memory-match/levels.ts
export interface LevelConfig {
  cols: number;
  rows: number;
  pairs: number; // cols × rows / 2
  timeLimit: number; // segundos
}
export const MAX_START_LEVEL = 5;
export const LEVELS: LevelConfig[]; // índices 0..4 = niveles 1..5
export function levelConfig(level: number): LevelConfig; // nivel ≥ 5 usa la tabla ampliada

// lib/memory-match/types.ts (campos nuevos)
export interface MemoryMatchSnapshot {
  // …campos del core
  level: number; // 1+
}
export interface MemoryMatchGame {
  // …métodos del core
  setStartLevel(level: number): void; // aplica en el siguiente restart()
}

// lib/memory-match/utils.ts (nuevo)
export interface BoardLayout { cell: number; card: number; originX: number; originY: number }
export function boardLayout(cols: number, rows: number): BoardLayout;
export function levelMultiplier(level: number): number; // min(level, 10)
```

Tabla de niveles (valores de diseño nuevos, decididos aquí):

| Nivel | Tablero | Pares | Tiempo |
| ----- | ------- | ----- | ------ |
| 1     | 4×4     | 8     | 60 s   |
| 2     | 5×4     | 10    | 80 s   |
| 3     | 6×4     | 12    | 100 s  |
| 4     | 6×5     | 15    | 125 s  |
| 5     | 6×6     | 18    | 150 s  |
| 6+    | 6×6     | 18    | `max(90, 150 − 10 × (nivel − 5))` s |

Convenciones:

- Nivel 1 es idéntico al core (mismo tablero, tiempo y fórmulas), de modo que el paso 4 no cambia su comportamiento.
- `boardLayout`: `cell = floor(min(600 / cols, 600 / rows))`, `card = cell − round(cell × 0.1)`, el tablero se centra en el área de 600×600 bajo la franja `HUD_H = 60` (`originX = (600 − cols × cell) / 2`, `originY = HUD_H + (600 − rows × cell) / 2`). Nivel 1: celda 150, carta 135 (el core usa 134; el valor final es el de `boardLayout`).
- Puntuación por pareja: `(PAIR_SCORE + STREAK_BONUS × (racha − 1)) × levelMultiplier(nivel)`. Bonus de fin de nivel: `(TIME_BONUS × segundos restantes + MOVE_BONUS × max(0, 2 × pares − movimientos)) × levelMultiplier(nivel)`. En el nivel 1 (`2 × 8 = 16`) coincide con el core.
- Tope del multiplicador `min(nivel, 10)`: el máximo por nivel con 18 pares queda en unos 110.000, por lo que alcanzar 1.000.000 exige más de nueve niveles casi perfectos; `GamePlayer` ya acota al guardar.
- Transición: al emparejar el último par se suma el bonus, se emite el snapshot, se espera `FLIP_MS` y se muestra el banner "NIVEL N" 900 ms; durante el banner la entrada (volteo) se ignora, el temporizador se detiene y el nuevo tablero se reparte barajado. El tiempo no se acumula: cada nivel arranca con su `timeLimit` completo y vuelve a descontar solo tras el primer volteo del nivel. `moves`, `pairs` y la racha se reinician por nivel; `score` se acumula.
- Reaparición del cursor: vuelve a `(0,0)` en cada tablero.
- Símbolos: `SYMBOLS` pasa a 18 entradas distintas (8 formas × colores, más 10 combinaciones nuevas); el nivel usa los primeros `pares` símbolos tras mezclar la lista, de modo que no siempre salen los mismos.
- `setStartLevel(n)` acota `n` a `1..MAX_START_LEVEL` y se aplica en el siguiente `restart()` (la opción es `restart`: el reproductor la muestra en el overlay de pausa y reinicia la partida). `start()` inicial usa el nivel 1.
- Snapshot: `level` se emite al cambiar de nivel; `pairs`/`totalPairs` reflejan el tablero actual. Orden del `hud`: `pairs`, `moves`, `time`, `level`.

```ts
// lib/game-registry.ts (adición)
options: [
  {
    key: "startLevel",
    label: "Nivel inicial",
    choices: ["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v })),
    defaultValue: "1",
    appliesOn: "restart",
  },
]
```

Estructura de archivos:

```
lib/memory-match/levels.ts   // nuevo
lib/memory-match/symbols.ts  // 8 → 18 símbolos
lib/memory-match/utils.ts    // boardLayout, levelMultiplier
lib/memory-match/types.ts    // level, setStartLevel
lib/memory-match/engine.ts   // niveles, banner, setStartLevel
lib/game-registry.ts         // hud level, option startLevel, setOption
```

---

## Plan de implementación

1. **Tabla de niveles y layout dinámico.**
   - Crear `lib/memory-match/levels.ts` (`LEVELS`, `MAX_START_LEVEL`, `levelConfig`) y añadir `boardLayout` y `levelMultiplier` a `lib/memory-match/utils.ts`; ampliar `types.ts` con `level` y `setStartLevel`.
   - Verificación: `npx tsc --noEmit`; `levelConfig(1)` = 4×4/60 s y `levelConfig(8).timeLimit` = 120 s.
2. **Más símbolos.**
   - Ampliar `SYMBOLS` en `lib/memory-match/symbols.ts` a 18 entradas distintas (forma + color) y ajustar `drawSymbol` para escalar con el tamaño de carta.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; ninguna pareja de símbolos tiene la misma forma y color.
3. **Motor: dibujo con layout dinámico.**
   - Reemplazar en `lib/memory-match/engine.ts` el uso de `CELL`/`CARD` fijos por `boardLayout(cols, rows)` en `draw`, el cursor y la colocación de cartas; el tablero sigue siendo 4×4 (nivel 1).
   - Verificación: `npx tsc --noEmit` y `npm run lint`; el nivel 1 se ve y juega igual que antes.
4. **Motor: niveles, transición y puntuación.**
   - En `lib/memory-match/engine.ts` añadir estado `level`, reparto con `levelConfig`, multiplicador y bonus de fin de nivel, banner "NIVEL N" de 900 ms con entrada y temporizador detenidos, y `setStartLevel`; la partida ya no termina al limpiar el tablero, solo por tiempo o `end()`.
   - Emitir `level` en el snapshot y dibujar NIVEL en el HUD del canvas.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; limpiar el nivel 1 muestra el banner y reparte un tablero 5×4.
5. **Registro y HUD de plataforma.**
   - Actualizar `memoryMatchSnapshot` en `lib/game-registry.ts` con el item `level` (`String(level).padStart(2, "0")`), añadir la opción `startLevel` (`appliesOn: "restart"`) y `setOption` que llama a `game.setStartLevel(Number(value))`.
   - Verificación: `/juegos/memory-match/jugar` muestra Nivel 01 en el HUD de plataforma y el selector "Nivel inicial" en el overlay de pausa; elegir 3 y reiniciar arranca un tablero 6×4.
6. **Verificación en navegador y documentación.**
   - Probar con Playwright los niveles 1 a 5 (con `startLevel`), guardar "TEST", ver leaderboard y borrar las filas de prueba de `scores`; actualizar la descripción de Memory en `CLAUDE.md` y `README.md`.
   - Verificación: `npm run lint` y `npm run build` pasan; ambos archivos mencionan `02-memory-match-levels.md`.

Cada paso = un commit `memory-match-NN: Paso N`.

---

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings, en todos los niveles.
- [ ] Pausa (`Esc`, `P`, botón), `Espacio` con foco en botones, guardado, modal y "JUGAR DE NUEVO" siguen funcionando como en el core.
- [ ] A 375 px el canvas se escala sin desbordar con tableros 4×4, 6×4 y 6×6.
- [ ] El mando táctil sigue manejando el juego en todos los tableros sin teclas pegadas.
- [ ] Guardar con nombre "TEST" inserta la fila con `game_id = 'memory-match'`; tras verificar, las filas de prueba están borradas.
- [ ] Los demás juegos registrados siguen funcionando igual.
- [ ] En desarrollo (StrictMode) hay una sola instancia.

**Específicos de Memory:**

- [ ] El nivel 1 es 4×4 con 8 pares y 60 s, con la misma puntuación que el core.
- [ ] Los niveles 2, 3, 4 y 5 son 5×4, 6×4, 6×5 y 6×6 con 10, 12, 15 y 18 pares y 80, 100, 125 y 150 s.
- [ ] El nivel 6 es 6×6 con 144 s `max(90, 150 − 10)`; a partir del nivel 12 el tiempo se queda en 90 s.
- [ ] Cada tablero queda centrado en el área de 600×600 sin solapar el HUD, con celdas cuadradas y cartas sin deformar.
- [ ] Hay tantos símbolos distintos como pares del nivel, cada uno en exactamente dos cartas.
- [ ] Emparejar el último par suma `(10 × segundos restantes + 25 × max(0, 2 × pares − movimientos)) × min(nivel, 10)` y muestra el banner "NIVEL N" durante 900 ms.
- [ ] Una pareja correcta suma `(100 + 50 × (racha − 1)) × min(nivel, 10)`.
- [ ] Durante el banner el volteo se ignora y el temporizador no descuenta; el nuevo nivel arranca con su tiempo completo y descuenta tras su primer volteo.
- [ ] Al cambiar de nivel, `moves`, `pairs`, la racha y el cursor se reinician y la puntuación se acumula.
- [ ] La partida no termina al limpiar un tablero; termina al llegar el tiempo a 0 o con FIN, con la puntuación real en el modal.
- [ ] El HUD de plataforma muestra Nivel con dos dígitos (`01`) y el HUD del canvas muestra NIVEL.
- [ ] El selector "Nivel inicial" aparece en el overlay de pausa con valores 1–5; al elegir N y pulsar "JUGAR DE NUEVO" o reiniciar, la partida arranca en el nivel N con su tablero y tiempo.
- [ ] Sin cambiar la opción, "JUGAR DE NUEVO" vuelve al nivel 1.

---

## Decisiones

- **Sí:** tabla de niveles en `lib/memory-match/levels.ts`, patrón `lib/arkanoid/levels.ts`. Razón: datos separados del motor y fáciles de ajustar.
- **Sí:** tableros 4×4, 5×4, 6×4, 6×5, 6×6 con tiempo creciente pero menor por par (7,5 s/par en el nivel 1, 8 en el 2 y unos 8,3 en los niveles 3, 4 y 5). Razón: la dificultad sube por memoria requerida, no solo por tiempo.
- **Sí:** a partir del nivel 6 el tablero se queda en 6×6 y el tiempo baja 10 s por nivel hasta 90 s. Razón: el área 600×600 limita el tamaño útil de las cartas; la dificultad final la da el tiempo.
- **Sí:** multiplicador de puntuación `min(nivel, 10)`. Razón: premia avanzar sin permitir que la puntuación llegue de forma realista a 1.000.000.
- **Sí:** el tiempo no se acumula entre niveles. Razón: evita partidas infinitas con un colchón de tiempo y mantiene cada nivel con su propio reto.
- **Sí:** banner "NIVEL N" dibujado en el canvas. Razón: es una transición de juego, no un overlay de pausa ni de game over, que sí corresponden a la plataforma.
- **Sí:** `startLevel` con `appliesOn: "restart"`, patrón Tetris. Razón: cambiarlo en mitad de partida rompería el tablero actual; el reproductor ya lo muestra en el overlay de pausa. Empezar en un nivel alto multiplica la puntuación igual que en Tetris; se acepta como decisión de diseño.
- **Sí:** sin vidas, igual que en el core (mecánica de una sola oportunidad); el tiempo sigue siendo el único recurso. El snapshot no incluye `lives`.
- **Sí:** HUD doble: el HUD del canvas añade NIVEL y el HUD de plataforma añade el item `level`.
- **No:** acumular tiempo restante, comodines o cartas trampa. Razón: cambian reglas del core; si llegan, van en otra spec.
- **No:** sonido, skins ni animación elaborada de transición. Razón: alcance acotado a niveles.
- **No:** tope de niveles. Razón: la partida acaba siempre por tiempo.

---

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Regresión del nivel 1 al sustituir `CELL`/`CARD` por `boardLayout`      | El paso 3 refactoriza sin cambiar de nivel; criterio de que el nivel 1 puntúa igual que el core.                             |
| Cartas de 100 px poco legibles en 6×6                                   | Símbolos con contraste alto y tamaño proporcional a `card`; comprobar visualmente 6×6 en el paso 4.                          |
| Entrada durante el banner voltea cartas del tablero viejo o del nuevo   | Estado `transition` que ignora el volteo y detiene el temporizador; criterio de aceptación.                                  |
| Opción `startLevel` no se aplica o se queda de la partida anterior      | `setStartLevel` se lee en `restart()`; criterio "sin cambiar la opción vuelve al nivel 1" y prueba con Playwright.           |
| Puntuación supera 1.000.000                                             | Multiplicador con tope 10 y `GamePlayer` ya acota al guardar.                                                                |
| Dos símbolos casi idénticos (forma y color parecidos) confunden         | 18 combinaciones forma + color revisadas con contraste en modo oscuro; criterio de símbolos distintos.                       |
| `dt` grande al reanudar tras el banner                                  | `dt` máximo 0,05 s y `lastTime` reiniciado en `resume()` y al repartir el tablero nuevo.                                      |

---

## Qué **no** está en esta spec

- Sonido, skins, animaciones elaboradas de transición, comodines y cartas trampa.
- Modo a dos jugadores, selección con ratón y gestos sobre el canvas.
- Controles táctiles más allá del `touchControls` del core y Supabase Auth.
- Cambios de esquema en `games`/`scores` y tests automatizados.
- Cambios de portada, migraciones y color de acento (están en `01-memory-match-core.md`).

Cada uno, si llega, va en su propia spec.
