# SPEC whack-a-mole-02 — Whack-a-Mole: topos especiales, combos y puntos flotantes

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 14 (cachés de capa), game-jam/whack-a-mole/01-whack-a-mole-core
> **Fecha:** 2026-11-20
> **Objetivo:** Añadir a Whack-a-Mole tres topos especiales (dorado, con casco y reloj), un multiplicador por racha de aciertos y puntos flotantes, para dar profundidad y rejugabilidad a la ronda de 60 s.

## Por qué existe esta spec

El core (`01`) deja una ronda funcional pero plana: un solo tipo de topo y una bomba. Esta spec añade decisiones de riesgo/recompensa (¿vale la pena ir a por el topo dorado fugaz o seguro a por el reloj?) y premia la precisión con una racha, sin tocar plataforma, migración ni portada. Sigue el patrón de power-ups/entidades temáticas de `lib/arkanoid/` y mantiene el motor en `lib/whack-a-mole/`.

## Alcance

**Dentro:**

- Ampliar `PopKind` con tres tipos nuevos: `gold` (dorado), `helmet` (con casco, 2 golpes) y `clock` (reloj, +tiempo).
- Probabilidades de aparición dependientes del tiempo transcurrido.
- Racha de aciertos con multiplicador de puntos (×1 a ×5) y su ruptura.
- Puntos flotantes (`+10`, `×3 +30`, `−50`, `+5 s`) con animación corta.
- Nuevo item de HUD de plataforma `combo` ("Racha") y HUD propio del canvas con el multiplicador.
- Sprites nuevos con primitivas de canvas en `lib/whack-a-mole/` (sin assets externos).

**Fuera de alcance (specs futuras):**

- Skins, sonido y música, selector de dificultad, modos de juego, boss.
- Control por ratón, controles táctiles/mobile propios, Supabase Auth, cambios de esquema en `games`/`scores`, tests automatizados.
- Cambios en migración, portada o `GAME_REGISTRY` salvo el adaptador del HUD (nuevo item `combo`).

## Modelo de datos

```ts
// lib/whack-a-mole/entities.ts (amplía el core)
export type PopKind = "mole" | "bomb" | "gold" | "helmet" | "clock";

export interface Pop {
  hole: number;
  kind: PopKind;
  age: number;
  life: number;
  hit: boolean;
  hp: number; // 1 salvo helmet = 2
}

export interface FloatText {
  x: number; // px lógicos
  y: number;
  text: string;
  age: number; // ms
  color: string;
}

// lib/whack-a-mole/types.ts (amplía el snapshot del core)
export interface WhackSnapshot {
  score: number;
  timeLeft: number;
  hits: number;
  combo: number; // multiplicador actual, 1..5
  status: WhackStatus;
}
```

```
// Archivos nuevos o modificados
lib/whack-a-mole/constants.ts   // SPECIALS (puntos, vida, hp, pesos), COMBO_STEP, COMBO_MAX, CLOCK_BONUS, FLOAT_MS
lib/whack-a-mole/utils.ts       // pickKind(elapsed, rand), comboMultiplier(streak)
lib/whack-a-mole/entities.ts    // PopKind ampliado, hp, FloatText
lib/whack-a-mole/engine.ts      // resolución de golpe por tipo, racha, flotantes, dibujo
lib/game-registry.ts            // adaptador whackAMoleSnapshot: añade item "combo"
```

Convenciones (valores de diseño nuevos decididos aquí):

- Tipos y reglas (la bomba y el topo normal no cambian respecto al core):

| Tipo     | Puntos base | Permanece (`life`)   | Golpes | Efecto extra                            |
| -------- | ----------- | -------------------- | ------ | --------------------------------------- |
| `mole`   | 10          | `upTime(elapsed)`    | 1      | —                                       |
| `gold`   | 50          | `upTime × 0,6` (≥300 ms) | 1  | —                                       |
| `helmet` | 30          | `upTime × 1,3`       | 2      | El primer golpe suena a casco: sin puntos, no rompe racha |
| `clock`  | 0           | `upTime`             | 1      | `+5 s` al tiempo restante (máx. 99 s en total) |
| `bomb`   | −50         | `upTime`             | 1      | `−3 s`, rompe racha                     |

- Aparición: se elige primero entre bomba y no-bomba con `bombChance(elapsed)` del core. En no-bomba, pesos: `gold` 6 % (desde `elapsed` ≥ 10 s), `helmet` 12 % (desde ≥ 20 s), `clock` 4 % (desde ≥ 15 s y solo si `timeLeft` ≤ 45), resto `mole`. Como máximo 1 `clock` y 1 `gold` simultáneos.
- Racha (`streak`): +1 por cada topo derribado (`mole`, `gold`, `helmet` al segundo golpe). Se **rompe** (a 0) al golpear una bomba o al golpear un agujero vacío. Un topo que se oculta sin ser golpeado **no** rompe la racha. El reloj no la suma ni la rompe.
- Multiplicador: `comboMultiplier(streak) = min(5, 1 + floor(streak / 5))` (×2 a 5 aciertos, ×5 a 20). Se aplica a los puntos base positivos (`mole`, `gold`, `helmet`); no a la bomba ni al reloj.
- Puntuación: `score += base × comboMultiplier(streak)` usando la racha **previa** al acierto. Máximo teórico por ronda ≈ 60 s a ritmo ≤ 0,35 s por aparición con topos de 50 puntos ×5 → muy por debajo de 1.000.000.
- Puntos flotantes: texto en el centro del agujero que sube 40 px y se desvanece en `FLOAT_MS = 700`; verde para positivos (`+50`, `×3 +30`), rojo para penalizaciones (`−50`, `−3 s`), cian para `+5 s`. Máximo 8 a la vez; los más antiguos se descartan.
- Sprites con primitivas: topo dorado (relleno `#ffd24a` con brillo), topo con casco (casco gris con una abolladura tras el primer golpe) y reloj (esfera con manecillas). Los sprites con glow se pre-renderizan con `createSpriteCache()` de `lib/canvas-cache.ts` (no `shadowBlur` por objeto cada frame) y se limpian en `destroy`.
- HUD del canvas: junto a ACIERTOS se dibuja la racha como `×N` y una barra de progreso hacia el siguiente escalón. HUD de plataforma: nuevo item `{ key: "combo", label: "Racha", value: "×3" }` añadido en el adaptador `whackAMoleSnapshot`.
- El snapshot solo se emite cuando cambia un campo, incluido `combo`.
- El tiempo ganado con el reloj mantiene el tope de 99 s; el contador `elapsed` de la dificultad **no** se altera.
- Teclas, controles y `touchControls` sin cambios respecto al core.

## Plan de implementación

1. **Tipos, constantes y utilidades.**
   - Ampliar `PopKind`, `Pop` (`hp`) y `WhackSnapshot` (`combo`) en `types.ts`/`entities.ts`; añadir a `constants.ts` la tabla de especiales, `COMBO_STEP = 5`, `COMBO_MAX = 5`, `CLOCK_BONUS = 5`, `MAX_TIME = 99`, `FLOAT_MS = 700`; añadir a `utils.ts` `pickKind(elapsed, rand)` y `comboMultiplier(streak)`.
   - Verificación: `npx tsc --noEmit`; `comboMultiplier(0)=1`, `(5)=2`, `(20)=5`, `(99)=5` en una comprobación manual de los valores.
2. **Aparición de especiales.**
   - Integrar `pickKind` en la aparición del motor respetando los umbrales de tiempo y los límites de 1 `clock` y 1 `gold` simultáneos; asignar `life` y `hp` por tipo.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; con `elapsed < 10 s` solo salen `mole` y `bomb`.
3. **Resolución de golpes y racha.**
   - Resolver por tipo: `gold` y `mole`, `helmet` en dos golpes (el primero sin puntos y sin romper racha), `clock` suma 5 s con tope 99, `bomb` rompe racha; golpe en agujero vacío rompe racha; aplicar `comboMultiplier` con la racha previa.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; secuencia de 5 topos seguidos hace que el sexto valga 20 puntos (×2).
4. **Puntos flotantes y dibujo.**
   - Añadir `FloatText` al estado del motor con animación de 700 ms y tope de 8; dibujar `×N` y barra de racha en el HUD del canvas; dibujar los sprites de `gold`, `helmet` (con estado abollado) y `clock`, usando `createSpriteCache()` y limpiándolo en `destroy`.
   - Verificación: render en `/juegos/whack-a-mole/jugar`: los flotantes suben y desaparecen sin acumularse.
5. **Adaptador de HUD.**
   - Editar `whackAMoleSnapshot` en `lib/game-registry.ts` para añadir el item `combo` ("Racha", `×N`), sin tocar el resto del registro ni `GamePlayer`.
   - Verificación: `npx tsc --noEmit`; el HUD de plataforma muestra Jugador, Puntuación, Tiempo, Aciertos y Racha.
6. **Verificación en navegador.**
   - Jugar una ronda con Playwright MCP golpeando todos los tipos, comprobar racha y flotantes, pausar/reanudar y reiniciar; borrar filas de prueba de `scores` con `execute_sql`; añadir esta spec a `CLAUDE.md` y `README.md`.
   - Verificación: `npm run lint` y `npm run build` pasan; `npm run perf` con `PERF_GAMES=whack-a-mole` ≥ 58 FPS con CPU ×6 si el juego está disponible.

Cada paso = un commit `whack-a-mole-02: Paso N`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings; sigue habiendo una sola instancia en StrictMode.
- [ ] Pausa (`Esc`, `P`, botón), FIN, "JUGAR DE NUEVO" y guardado de puntuación funcionan igual que en el core, sin teclas pegadas.
- [ ] El mando táctil sigue manejando el juego (d-pad + "GOLPEAR") sin cambios.
- [ ] `destroy()` no deja listeners ni bucle activos y libera las cachés.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y el core de Whack-a-Mole siguen funcionando igual.
- [ ] Tras verificar, las filas de prueba de `scores` están borradas.

**Específicos de Whack-a-Mole (especiales y combos):**

- [ ] Durante los primeros 10 s solo aparecen topos normales y bombas.
- [ ] El topo dorado aparece desde los 10 s, vale 50 puntos base y permanece `upTime × 0,6` (mínimo 300 ms).
- [ ] El topo con casco aparece desde los 20 s; el primer golpe no suma puntos ni rompe la racha y el segundo suma 30 puntos base.
- [ ] El reloj aparece desde los 15 s solo con 45 s o menos restantes, suma 5 s al golpearlo y el tiempo nunca supera 99 s.
- [ ] Nunca hay más de un reloj ni más de un dorado a la vez.
- [ ] La racha sube 1 por topo derribado; el multiplicador es ×1 (0-4), ×2 (5-9), ×3 (10-14), ×4 (15-19) y ×5 (20 o más).
- [ ] Golpear una bomba o un agujero vacío pone la racha a 0; un topo que se oculta sin ser golpeado no la rompe.
- [ ] El multiplicador usa la racha previa al acierto y no afecta a la bomba ni al reloj.
- [ ] Aparecen puntos flotantes con el valor ganado o perdido, que desaparecen a los 700 ms; nunca hay más de 8.
- [ ] El HUD del canvas muestra `×N` y la barra de racha; el HUD de plataforma muestra "Racha" con `×N`.
- [ ] `restart()` pone la racha a 0 y limpia los flotantes y los especiales.
- [ ] La puntuación máxima de una ronda queda por debajo de 1.000.000.

## Decisiones

- **Sí:** tres especiales (dorado, casco, reloj). Razón: cada uno aporta una decisión distinta (riesgo por tiempo de exposición, persistencia, gestión del tiempo) con reglas simples.
- **Sí:** racha con multiplicador máximo ×5, rota por bomba o golpe en vacío, no por topo que escapa. Razón: premia la precisión sin castigar la limitación de reflejos y refuerza el enfriamiento del core contra el spam.
- **Sí:** el reloj solo aparece con poco tiempo restante y con tope de 99 s. Razón: evita rondas indefinidas y puntuaciones exageradas.
- **Sí:** `elapsed` de la dificultad no se altera con el reloj ni con la penalización de bomba. Razón: la curva de dificultad depende solo del tiempo jugado.
- **Sí:** puntos flotantes acotados a 8. Razón: legibilidad y coste de dibujo constante.
- **Sí:** sprites con primitivas y glow vía `createSpriteCache()`. Razón: SPEC 14 prohíbe `shadowBlur` por objeto cada frame.
- **Sí:** el item de HUD `combo` se añade solo en el adaptador del registro, sin ramas por `game.id`. Razón: contrato genérico `GameSnapshot.hud`.
- **Sí:** se mantiene la ausencia de vidas del core. Razón: sigue siendo una ronda cronometrada única; el reloj y la bomba ya modulan el tiempo.
- **No:** skins, sonido y música. Razón: otro alcance (patrones Tetris/Arkanoid), spec futura.
- **No:** nuevo tipo de score ni cambios de esquema. Razón: el score sigue siendo entero y cabe en el CHECK de `scores`.
- **No:** control por ratón ni nuevos botones en el mando. Razón: el esquema de teclado del core ya cubre todos los tipos.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dificultad desbalanceada con topo dorado de vida muy corta        | Mínimo de 300 ms y comprobación manual en el paso 6; ajustar el factor 0,6 solo con una decisión registrada. |
| Racha se rompe con spam en el mando táctil                        | El enfriamiento de 150 ms del core limita los golpes en vacío; criterios verifican la ruptura.                |
| El casco confunde al jugador (primer golpe sin puntos)            | El sprite cambia (abolladura) tras el primer golpe y el flotante muestra "CASCO".                             |
| `shadowBlur` por objeto bajaría los FPS con CPU ×6                | Sprites con glow en `createSpriteCache()`, limpiados en `destroy`; verificación con `npm run perf`.           |
| Tope de 99 s y reloj prolongan la ronda en exceso                 | Aparición solo con `timeLeft` ≤ 45 y máximo 1 reloj simultáneo.                                              |
| Cambio de `WhackSnapshot` rompe el adaptador del registro         | Se edita adaptador y tipo en el mismo paso; `npx tsc --noEmit` lo detecta.                                    |
| Flotantes acumulados degradan el render                           | Tope de 8 y vida de 700 ms.                                                                                  |

## Qué **no** está en esta spec

- Skins, sonido, música, selector de dificultad, modos de juego y boss.
- Control por ratón, controles táctiles propios, Supabase Auth, cambios de esquema en `games`/`scores` y anti-trampa.
- Cambios de migración, portada o canvas respecto al core.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
