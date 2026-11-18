# SPEC space-invaders-02 — Space Invaders: oleadas diseñadas, invasores blindados y nave nodriza

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 08 (patrón `lib/arkanoid/levels.ts`), game-jam/space-invaders/01-space-invaders-core
> **Fecha:** 2026-11-18
> **Objetivo:** Sustituir la formación única del core por 8 oleadas diseñadas en `lib/space-invaders/levels.ts`, añadir invasores blindados y una nave nodriza (jefe) cada 5 niveles, sin cambiar el contrato con la plataforma.

## Por qué existe esta spec

El core (spec 01) repite la misma formación de 5×10 en cada nivel y solo sube la velocidad. Eso se vuelve monótono a partir del nivel 3. Esta spec aporta variedad con el patrón ya probado en Arkanoid (`lib/arkanoid/levels.ts`: un mapa declarativo por nivel) y un pico de dificultad con un jefe periódico. No toca registro, migración, portada ni HUD de plataforma: todo el alcance vive dentro de `lib/space-invaders/`.

## Alcance

**Dentro:**

- `lib/space-invaders/levels.ts` con 8 oleadas declarativas (mapa de 5 filas × 10 columnas por nivel) que se repiten en ciclo a partir del nivel 9 con la dificultad por parámetros del core.
- Dos tipos de invasor: `grunt` (1 impacto) y `armored` (2 impactos, se dibuja con borde reforzado y cambia de color tras el primer impacto).
- Nave nodriza (`boss`) en los niveles 5, 10, 15…: aparece en lugar de la formación, con barra de vida dibujada en el canvas y patrón de disparo propio.
- Puntuación específica de blindados y jefe.
- Aviso visual en el canvas al empezar una oleada ("OLEADA N" y, en jefe, "NODRIZA") durante 1,2 s, dibujado como parte del juego (no overlay de pausa ni de game over).
- Adaptación del motor del core: `Invader` pasa a tener `kind` y `hp`; `stepInterval` normaliza por el número inicial de invasores.

**Fuera de alcance (specs futuras):**

- Skins, sonido y opciones de plataforma (spec 03).
- Más tipos de enemigo (en picado, teletransportables), power-ups del jugador, armas especiales.
- Cambios de registro, migración, portada o HUD de plataforma; selector de nivel inicial.
- Controles táctiles nuevos (el `touchControls` del core ya cubre todo), Supabase Auth, cambios de esquema en `games`/`scores`, tests automatizados.

## Modelo de datos

```ts
// lib/space-invaders/types.ts (extensión)
export type InvaderKind = "grunt" | "armored";

// lib/space-invaders/entities.ts (extensión)
export interface Invader {
  col: number;
  row: number;
  kind: InvaderKind;
  hp: number; // grunt 1, armored 2; alive = hp > 0
}

export interface Boss {
  x: number; // esquina superior izquierda en px
  y: number;
  dir: 1 | -1;
  hp: number;
  maxHp: number;
  fireTimer: number; // segundos hasta la próxima ráfaga
}

// lib/space-invaders/levels.ts
export interface WaveDef {
  rows: string[]; // 5 cadenas de 10 caracteres: "." vacío, "g" grunt, "a" armored
}
export const WAVES: WaveDef[]; // 8 entradas
export function waveFor(level: number): WaveDef; // WAVES[(level - 1) % WAVES.length]
export function isBossLevel(level: number): boolean; // level % 5 === 0
export function bossMaxHp(level: number): number; // 20 + 5 * (level / 5 - 1)
```

Oleadas (nivel → mapa, fila 0 arriba; el tipo de sprite y los puntos base siguen dependiendo de la fila, como en el core):

| Nivel | Fila 0       | Fila 1       | Fila 2       | Fila 3       | Fila 4       | Idea                          |
| ----- | ------------ | ------------ | ------------ | ------------ | ------------ | ----------------------------- |
| 1     | `gggggggggg` | `gggggggggg` | `gggggggggg` | `gggggggggg` | `gggggggggg` | Formación completa del core   |
| 2     | `aaaaaaaaaa` | `gggggggggg` | `gggggggggg` | `gggggggggg` | `gggggggggg` | Fila superior blindada        |
| 3     | `.gggggggg.` | `gggggggggg` | `gggggggggg` | `.gggggggg.` | `..gggggg..` | Diamante recortado            |
| 4     | `g.g.g.g.g.` | `.g.g.g.g.g` | `g.g.g.g.g.` | `.g.g.g.g.g` | `g.g.g.g.g.` | Tablero de ajedrez            |
| 5     | `gggggggggg` | `..........` | `..........` | `..........` | `..........` | Escolta del jefe (ver reglas) |
| 6     | `aaaaaaaaaa` | `gggggggggg` | `aaaaaaaaaa` | `gggggggggg` | `aaaaaaaaaa` | Franjas blindadas             |
| 7     | `a........a` | `ga......ag` | `gga....agg` | `ggga..aggg` | `gggggggggg` | Embudo con flancos blindados  |
| 8     | `aaaaaaaaaa` | `agggggggga` | `agggggggga` | `agggggggga` | `aaaaaaaaaa` | Marco blindado                |

Reglas de diseño (valores nuevos decididos aquí):

- **Blindado:** 2 impactos. El primero suma `5` puntos y cambia el color del sprite; el segundo suma el doble de los puntos base de su fila (`60`, `40` o `20`).
- **Normalización de la marcha:** `stepInterval = max(45, 11 × vivos × (50 / total)) × max(0,6, 1 − 0,06 × (nivel − 1))` ms, con `total` = invasores iniciales de la oleada (el core usa `50`, valor idéntico para el nivel 1). Evita que una oleada con huecos (nivel 3 o 4) arranque demasiado rápido.
- **Altura inicial:** se mantiene `y0 = 90 + 16 × min(level − 1, 4)` del core; en niveles de jefe no se aplica (la escolta empieza a `y0 = 110`).
- **Disparos alienígenas:** siguen saliendo del invasor vivo más bajo de una columna con invasores; las columnas vacías se omiten.
- **Nivel de jefe (5, 10, 15…):**
  - Formación: solo la escolta del mapa del nivel 5 (una fila de 10 grunts), que se mueve con las reglas normales. Al destruirla no termina el nivel.
  - Jefe `88 × 36` px a `y = 54`, `x` inicial 256, velocidad horizontal `80` px/s, rebota en los márgenes de 20 px.
  - Vida: `bossMaxHp(level) = 20 + 5 × (level / 5 − 1)` impactos (nivel 5 → 20, nivel 10 → 25).
  - Cada impacto de la bala del jugador resta 1 de vida y suma `10`.
  - Ráfaga: cada `1,6 s` (`fireTimer`) lanza 3 balas desde su centro con deriva horizontal `−60`, `0`, `+60` px/s. Las balas del jefe no cuentan para el máximo de 3 balas de invasor del core y tienen un tope propio de 6 en vuelo.
  - Barra de vida del jefe dibujada en el canvas (franja de 200 × 6 px bajo el HUD, de verde a rojo).
  - Recompensa al destruirlo: `1000 + 500 × (level / 5 − 1)` puntos; con él destruido, el nivel se supera aunque queden invasores de escolta (se eliminan sin puntos).
  - El UFO bonus no aparece en niveles de jefe.
  - Derrota por invasión (`y ≥ 580`) sigue aplicando a la escolta.
- **Aviso de oleada:** durante 1,2 s tras el comienzo de cada nivel el motor dibuja `OLEADA NN` centrado (y bajo él `NODRIZA` en nivel de jefe) y bloquea el disparo, como la pausa interna de 1,2 s del core. Es parte de la escena, no un overlay de la plataforma.
- **Rango de puntuación:** por jefe ≤ 1.000 + 500 × k más impactos (10 × vida); decenas de miles tras muchas oleadas, muy por debajo de 1.000.000.

Estructura de archivos:

```
lib/space-invaders/levels.ts     // WAVES, waveFor, isBossLevel, bossMaxHp (nuevo)
lib/space-invaders/entities.ts   // Invader con kind/hp, Boss, fábricas buildFormation(level), createBoss(level)
lib/space-invaders/engine.ts     // lógica y dibujo de blindados, jefe y aviso de oleada
lib/space-invaders/constants.ts  // BOSS_W, BOSS_H, BOSS_SPEED, BOSS_FIRE_INTERVAL, BOSS_BULLET_CAP, WAVE_BANNER
lib/space-invaders/utils.ts      // stepInterval(vivos, total, level)
```

## Plan de implementación

1. **Datos de oleadas.**
   - Crear `lib/space-invaders/levels.ts` con `WAVES` (8 mapas de la tabla), `waveFor`, `isBossLevel` y `bossMaxHp`; añadir las constantes del jefe a `constants.ts`.
   - Verificación: `npx tsc --noEmit`; cada mapa tiene 5 cadenas de 10 caracteres válidos (`.`, `g`, `a`).
2. **Formación por mapa e invasores blindados.**
   - Extender `Invader` con `kind` y `hp`; crear `buildFormation(level)` que lee `waveFor(level)`; adaptar `stepInterval` con `total` y el cálculo de puntos (blindado: 5 + doble).
   - Dibujo del blindado con borde reforzado y color alternativo tras el primer impacto.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; el nivel 1 es idéntico al del core (50 invasores, mismos tiempos de paso).
3. **Nave nodriza.**
   - Crear `Boss`, `createBoss(level)` y su lógica en `engine.ts`: movimiento con rebote, ráfaga de 3 balas, tope de 6 balas de jefe, colisión con la bala del jugador, barra de vida, recompensa y fin de nivel al destruirla; sin UFO en nivel de jefe.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; jugar hasta el nivel 5 (o forzar el nivel inicial en desarrollo con un cambio temporal no commiteado).
4. **Aviso de oleada y pulido.**
   - Dibujar `OLEADA NN` y `NODRIZA` 1,2 s, bloquear disparo durante el aviso, respetar pausa (el temporizador se congela) y `restart()`.
   - Verificación: pausar durante el aviso no avanza el tiempo; `restart()` vuelve a mostrar `OLEADA 01`.
5. **Documentación.**
   - Añadir esta spec a `CLAUDE.md` y `README.md` (lista de specs de `space-invaders`).
   - Verificación: ambos la mencionan; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `space-invaders-waves-boss: Paso N`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] Sin cambios en `games`, `scores`, migraciones, portada ni en el adaptador del registro.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings; en desarrollo (StrictMode) hay una sola instancia.
- [ ] Pausa, FIN, game over, "JUGAR DE NUEVO" y guardado funcionan igual que en la spec 01; el canvas no dibuja texto de pausa ni "GAME OVER".
- [ ] Pausar congela jefe, balas, temporizadores y el aviso de oleada.
- [ ] Al perder la última vida se emite `lives = 0` y después `onGameOver(score)` una sola vez.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y el núcleo de Space Invaders siguen funcionando igual; `lib/` de otros juegos no cambia.

**Específicos de Space Invaders:**

- [ ] El nivel 1 reproduce la formación 5×10 del core (50 invasores, 550 ms por paso al inicio).
- [ ] Cada nivel 1–8 carga el mapa de la tabla; el nivel 9 repite el mapa del nivel 1 con la dificultad del nivel 9.
- [ ] Un blindado necesita 2 impactos: el primero suma 5 y cambia su color; el segundo suma 60, 40 o 20 según su fila.
- [ ] En el nivel 3 (con huecos) el paso inicial es más lento que `max(45, 11 × vivos)` sin normalizar; con el mapa completo es idéntico al del core.
- [ ] Las columnas sin invasores vivos no disparan.
- [ ] En el nivel 5 aparece una escolta de 10 grunts y la nave nodriza con 20 de vida y barra de vida visible; el nivel 10 la lleva a 25.
- [ ] Cada impacto al jefe resta 1 de vida y suma 10; al destruirlo suma 1000 (nivel 5) o 1500 (nivel 10) y supera el nivel aunque queden escoltas.
- [ ] El jefe lanza una ráfaga de 3 balas cada 1,6 s con derivas −60, 0 y +60 px/s, con un máximo de 6 balas de jefe en vuelo.
- [ ] No aparece el UFO en niveles de jefe.
- [ ] Al empezar cada nivel se dibuja `OLEADA NN` durante 1,2 s (y `NODRIZA` en nivel de jefe) y no se puede disparar durante ese tiempo.

## Decisiones

- **Sí:** mapas declarativos por nivel en `levels.ts`. Razón: mismo patrón que `lib/arkanoid/levels.ts`, fácil de revisar y de ampliar sin tocar el motor.
- **Sí:** 8 oleadas en ciclo con dificultad por parámetros a partir del 9. Razón: partida sin fin sin escribir infinitos mapas.
- **Sí:** dos tipos de invasor (`grunt`, `armored`). Razón: variedad con un solo atributo nuevo (`hp`), sin comportamientos nuevos que balancear.
- **Sí:** jefe cada 5 niveles con vida creciente. Razón: pico de dificultad y recompensa clara; sin tocar el HUD de plataforma.
- **Sí:** mantener 3 vidas y el orden `lives = 0` antes de `onGameOver` del core. Razón: no alterar el contrato ni el balance justificado en la spec 01.
- **Sí:** HUD doble sin cambios (canvas con PUNTOS, VIDAS, NIVEL y la barra del jefe; plataforma con Jugador, Puntuación, Vidas y Nivel). Razón: la barra del jefe es del escenario, no un dato nuevo del snapshot.
- **Sí:** normalizar `stepInterval` por `total`. Razón: un mapa con huecos no debe empezar más rápido que el completo.
- **No:** nuevos campos en `SpaceInvadersSnapshot` ni en `hud`. Razón: el contrato con la plataforma no cambia.
- **No:** power-ups, enemigos en picado ni selector de nivel inicial. Razón: alcance acotado; otra spec si llega.
- **No:** controles táctiles nuevos, Supabase Auth ni cambios de esquema.

## Riesgos

| Riesgo                                                    | Mitigación                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mapas con huecos hacen la marcha demasiado rápida o lenta | Normalización por `total` y suelo de 45 ms; criterio de aceptación en nivel 3               |
| El nivel de jefe queda imposible por demasiadas balas     | Tope de 6 balas de jefe, ráfaga cada 1,6 s y escudos regenerados al empezar el nivel        |
| Blindado ambiguo visualmente                              | Borde reforzado y cambio de color tras el primer impacto; verificación visual en Playwright |
| Regresión del nivel 1 respecto al core                    | Criterio: mismo número de invasores y mismos tiempos de paso                                |
| Aviso de oleada deja la entrada bloqueada tras pausar     | El temporizador del aviso se congela con la pausa y se reinicia en `restart()`              |
| Probar el nivel 5 es lento                                | Verificación asistida con cambio temporal del nivel inicial, no commiteado                  |

## Qué **no** está en esta spec

- Skins, sonido y opciones de plataforma (spec 03).
- Más tipos de enemigo, power-ups y armas especiales.
- Cambios de registro, migración, portada y HUD de plataforma; selector de nivel inicial.
- Controles táctiles nuevos, Supabase Auth, cambios de esquema en `games`/`scores` y tests automatizados.

Cada uno, si llega, va en su propia spec.
