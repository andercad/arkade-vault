# SPEC 05 — Asteroids: primer juego real jugable en la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (reproductor `/juegos/[id]/jugar`, `GamePlayer`, `saveScore`, `av_scores`)
> **Fecha:** 2026-11-13
> **Objetivo:** Portar el juego de `references/started-games/asteroids` a un módulo TypeScript sin globales, añadirlo al catálogo como juego nuevo `asteroids` y jugarlo en `/juegos/asteroids/jugar` dentro del reproductor existente, que controla pausa, fin de juego y guardado de puntuación.

---

## Por qué existe esta spec

Hasta ahora el reproductor (SPEC 01) solo simula una partida con un timer. `references/started-games/asteroids` es un Asteroids completo en canvas + JS vanilla (`game.js`, ~500 líneas, variables globales, listeners en `window`, `requestAnimationFrame` sin cancelar). Ese código no puede pegarse tal cual en React: se rompe con navegación SPA y StrictMode (listeners duplicados, bucle huérfano) y no se comunica con la UI. Hay que convertirlo en un motor con ciclo de vida (`destroy`) que notifique su estado al contenedor, y que sea el contenedor (el reproductor ya dibujado) quien decida pausa y fin de juego.

---

## Alcance

**Dentro:**

- Nuevo juego `asteroids` en el catálogo (`lib/games.ts`), como 9º elemento; **`rocas` no se toca** (decisión del usuario: Asteroids es un juego nuevo).
  - Aparece en biblioteca, detalle (`/juegos/asteroids`) y tabs del Salón de la Fama por los mecanismos existentes.
  - Portada `cover-asteroids` nueva en `app/globals.css`.
- Motor en `lib/asteroids/` (TypeScript, sin globales, sin dependencias):
  - Port fiel de `game.js`: nave, balas, asteroides (3 tamaños, división), partículas, power-up de disparo triple, mundo toroidal, niveles, vidas, invencibilidad al reaparecer, puntuación 20/50/100.
  - API `createAsteroidsGame(canvas, callbacks)` que devuelve `{ start, pause, resume, restart, end, destroy }`.
  - El motor implementa los estados de pausa y game over, pero **no dibuja** sus overlays: los muestra el contenedor.
  - Notifica a React un snapshot (`score`, `lives`, `level`, `tripleSeconds`, `status`) solo cuando cambia, y `onGameOver(finalScore)`.
- Componente cliente `components/asteroids-canvas.tsx`: monta el motor en `useEffect` con cleanup completo.
- `components/game-player.tsx`: para `game.id === "asteroids"` sustituye la arena simulada por el canvas real.
  - Se mantienen **los dos HUDs**: el del canvas (SCORE, NIVEL, TRIPLE, iconos de vidas, como el original) y el HUD de plataforma (Jugador, Puntuación, Vidas, Nivel) alimentado por el snapshot del motor.
  - La pausa se activa de dos formas que acaban en el mismo estado: el botón PAUSA/REANUDAR del contenedor (`pause()`/`resume()`) y las teclas `Esc` o `P` dentro del juego (alternan pausa). El motor notifica `status: "paused"` y React muestra el overlay "EN PAUSA" ya existente y pone el botón en "REANUDAR", se pause por botón o por tecla. El canvas no dibuja overlay de pausa.
  - El overlay "EN PAUSA" incluye la pista de teclas: "PULSA REANUDAR, P O ESC PARA CONTINUAR".
  - FIN llama a `end()`; el game over del motor (vidas a 0 o FIN) dispara `onGameOver` y React abre el modal "FIN DEL JUEGO" con la puntuación real.
  - "JUGAR DE NUEVO" llama a `restart()`; "GUARDAR PUNTUACIÓN" usa `saveScore` existente.
- Canvas lógico 800×600 escalado por CSS al ancho disponible del `.crt-screen`, manteniendo 4:3.
- Aviso en pantallas táctiles (`pointer: coarse`): "REQUIERE TECLADO".
- Los otros 7 juegos simulados siguen usando el reproductor simulado sin cambios.
- Añadir la spec 05 a la lista de specs de `CLAUDE.md` y a la tabla "Specs" de `README.md`. Regla permanente: cada vez que se actualice `CLAUDE.md`, se actualiza también `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- Controles táctiles / gamepad en pantalla.
- Sonido y música.
- OVNIs, nuevos tipos de asteroide (estrella fugaz) u otros power-ups no presentes en `game.js`.
- Cambios de reglas o de balance respecto al original.
- Modificar el juego `rocas` o su ficha del catálogo.
- Guardar puntuaciones en Supabase, rankings reales, leer `av_scores` en el Salón/Leaderboard.
- Pausa automática al perder foco o cambiar de pestaña.
- Escalado por `devicePixelRatio` / reestilizado neón del canvas (se mantienen vectores blanco/negro).
- Port del resto de juegos del catálogo.
- Tests automatizados.

---

## Modelo de datos

```ts
// lib/games.ts — nueva entrada al final de GAMES (sin tocar las existentes)
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Sobrevive al campo de asteroides.",
  long: "Pilota tu nave en un espacio sin bordes. Rota, propulsa y dispara para partir asteroides en fragmentos cada vez más pequeños. Recoge el disparo triple y aguanta oleadas cada vez mayores.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "magenta",
  best: 0,        // placeholder mock, como el resto de datos del catálogo
  plays: "0",
}
```

```ts
// lib/asteroids/types.ts
export type AsteroidsStatus = "playing" | "dead" | "paused" | "gameover";
// "dead" = nave destruida esperando reaparecer (deadTimer del original)

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  tripleSeconds: number; // Math.ceil del tiempo restante del power-up, 0 si no hay
  status: AsteroidsStatus;
}

export interface AsteroidsCallbacks {
  onState(s: AsteroidsSnapshot): void; // solo cuando algún campo cambia
  onGameOver(finalScore: number): void; // una vez por partida
}

export interface AsteroidsGame {
  start(): void; // inicia partida y bucle
  pause(): void; // congela update; el bucle sigue dibujando el último frame
  resume(): void;
  restart(): void; // initGame() y status "playing"
  end(): void; // fuerza game over desde cualquier estado (botón FIN)
  destroy(): void; // cancela rAF y quita todos los listeners
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

```
// Estructura de archivos nueva
lib/asteroids/constants.ts   // W=800, H=600, RADII, SPEEDS, POINTS, POWERUP_TTL, TRIPLE_DURATION, SPREAD
lib/asteroids/utils.ts       // wrap, dist, rand, randInt
lib/asteroids/entities.ts    // Bullet, Asteroid, Ship, Particle, PowerUp (reciben ctx/teclas, sin globales)
lib/asteroids/engine.ts      // createAsteroidsGame, estado, update/draw, input, bucle
lib/asteroids/types.ts
components/asteroids-canvas.tsx
```

Convenciones:

- Valores numéricos y fórmulas idénticos a `game.js` (velocidades, cooldown 0,2 s, invencibilidad 3 s, `dt` máximo 0,05 s).
- Teclas: `ArrowLeft`/`ArrowRight` rotan, `ArrowUp` propulsa, `Space` dispara (un disparo por pulsación, como `pressed()` del original). `ArrowDown` solo se bloquea para que la página no haga scroll.
- Los listeners de teclado van en `window` y se registran en `start()`; `preventDefault` solo sobre `ArrowLeft/Right/Up/Down` y `Space` mientras el juego está montado.
- Al pausar, terminar, reiniciar y en `blur` de la ventana se vacía el mapa de teclas para evitar teclas "pegadas".
- `Esc` y `P` (`event.code` `Escape` y `KeyP`) alternan pausa; se ignoran en game over y se procesan como pulsación única (sin repetición al mantener). Tras alternar, el motor llama a `onState` con el nuevo `status`.
- El estado `paused` es independiente de `status` interno; el snapshot informa `status: "paused"` mientras dure.
- Sin lecturas de `localStorage` ni `Math.random` durante el render de React; el motor solo se crea en `useEffect`.
- Persistencia: sin estructuras nuevas; se reutiliza `av_scores` vía `saveScore({ game: "asteroids", score, name })`.

---

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs, y revisar `components/game-player.tsx`, `.crt-screen` y `.game-arena` en `app/globals.css`. Añadir la entrada `asteroids` al final de `GAMES` y la clase `.cover-asteroids` (aplicar `/frontend-design`, coherente con `.cover-rocas` pero distinguible). Verificación: `npx tsc --noEmit` pasa; la biblioteca muestra 9 tarjetas; `/juegos/asteroids` carga con su portada; `/juegos/rocas` no cambia; `/juegos/asteroids/jugar` aún muestra la simulación.
2. Crear `lib/asteroids/constants.ts`, `utils.ts` y `types.ts` con los valores y tipos portados de `game.js`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `lib/asteroids/entities.ts`: `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` con sus `update`/`draw`, recibiendo `ctx` y el mapa de teclas por parámetro en lugar de globales. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. Crear `lib/asteroids/engine.ts` con `createAsteroidsGame`: estado, `initGame`/`nextLevel`/`killShip`, `update`, `draw` (incluido el HUD del canvas, sin overlay de game over), bucle con `requestAnimationFrame`, input con cleanup (incluidas las teclas `Esc`/`P` que alternan pausa), `pause/resume/restart/end/destroy`, y notificación de snapshot solo ante cambios. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
5. Crear `components/asteroids-canvas.tsx` (cliente): `<canvas width=800 height=600>`, crea el motor en `useEffect`, expone el control (`pause/resume/restart/end`) al padre y llama a `destroy()` en el cleanup. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
6. Modificar `components/game-player.tsx`: si `game.id === "asteroids"`, renderizar `AsteroidsCanvas` en `.crt-screen` en lugar de la arena simulada; sin el `setInterval` simulado; HUD de plataforma desde el snapshot; PAUSA/REANUDAR, FIN y "JUGAR DE NUEVO" conectados al motor; overlay "EN PAUSA" y etiqueta del botón derivados de `snapshot.status` (así reflejan también la pausa por `Esc`/`P`); `onGameOver` abre el modal; guardar con `saveScore`. Verificación: en `/juegos/asteroids/jugar` se juega con el teclado, la puntuación real aparece en ambos HUDs, pausa congela y reanuda, FIN y perder las 3 vidas abren el modal con el score real; `/juegos/bloque-buster/jugar` sigue simulado.
7. Escalado y aviso táctil en `app/globals.css` (y marcado en `AsteroidsCanvas`/`GamePlayer` si hace falta): canvas al 100 % del ancho con `aspect-ratio: 4 / 3` y `max-width: 800px`; aviso "REQUIERE TECLADO" visible solo con `@media (pointer: coarse)`. Verificación: a 375 px de ancho el canvas no desborda; en escritorio no aparece el aviso.
8. Añadir la spec 05 a la sección "Specs" de `CLAUDE.md` y a la tabla "Specs" de `README.md` (ambos en el mismo commit). Verificación: ambos archivos mencionan `05-asteroids.md`; `npm run lint` y `npm run build` pasan.

Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` según `AGENTS.md`. Para el diseño visual (portada y aviso) aplicar `/frontend-design`, según `CLAUDE.md`. Las verificaciones de juego (pausa, game over, modal) se hacen con Playwright en el navegador.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] La biblioteca muestra 9 tarjetas y "ASTEROIDS" aparece con la portada `cover-asteroids`; el chip "SHOOTER" deja 3 (INVASORES, ROCAS, ASTEROIDS).
- [ ] `/juegos/asteroids` carga; "JUGAR AHORA" lleva a `/juegos/asteroids/jugar`.
- [ ] El juego `rocas` conserva su ficha, portada y reproductor simulado sin cambios.
- [ ] `/juegos/bloque-buster/jugar` sigue mostrando la simulación (puntuación que sube sola).
- [ ] En `/juegos/asteroids/jugar` el canvas muestra la nave centrada y 4 asteroides grandes al iniciar, sin errores en la consola.
- [ ] `←` y `→` rotan la nave, `↑` la propulsa, `Espacio` dispara una bala por pulsación y la página no hace scroll con las flechas ni con `Espacio`.
- [ ] Un asteroide grande destruido suma 20, uno mediano 50 y uno pequeño 100; el HUD de plataforma y el HUD del canvas muestran la misma puntuación.
- [ ] Un asteroide grande se parte en 2 medianos, y uno mediano en 2 pequeños.
- [ ] Nave, balas y asteroides reaparecen por el lado opuesto al salir del canvas.
- [ ] La partida empieza con 3 vidas; chocar con un asteroide resta una, la nave reaparece tras 2 s parpadeando durante la invencibilidad de 3 s.
- [ ] Al destruir todos los asteroides, el nivel sube y aparecen `3 + nivel` asteroides grandes.
- [ ] Al recoger el power-up "3" la nave dispara 3 balas en abanico durante 5 s y el HUD muestra `TRIPLE Ns`.
- [ ] "PAUSA" congela nave, asteroides y balas y muestra "EN PAUSA"; "REANUDAR" continúa donde se dejó; las teclas pulsadas durante la pausa no mueven la nave ni disparan.
- [ ] `Esc` y `P` pausan y reanudan el juego igual que el botón: el contenedor muestra "EN PAUSA", el botón pasa a "REANUDAR" y viceversa.
- [ ] Mantener pulsada `P` o `Esc` no alterna la pausa repetidamente, y en game over no tienen efecto.
- [ ] El canvas no dibuja ningún texto de pausa; la pista "PULSA REANUDAR, P O ESC PARA CONTINUAR" aparece en el overlay de React.
- [ ] Pulsar `Espacio` con el foco en el botón PAUSA/FIN no dispara el botón ni altera la pausa.
- [ ] Perder las 3 vidas abre el modal "FIN DEL JUEGO" con la puntuación real; el canvas no dibuja texto "GAME OVER" propio.
- [ ] "FIN" abre el mismo modal desde cualquier estado (jugando, esperando reaparición o en pausa).
- [ ] En game over `Espacio` no reinicia la partida; solo "JUGAR DE NUEVO" lo hace.
- [ ] "JUGAR DE NUEVO" reinicia puntuación a 0, 3 vidas, nivel 1, sin teclas pegadas.
- [ ] "GUARDAR PUNTUACIÓN" añade `{ game: "asteroids", score, name, at }` a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] "SALIR" y "VOLVER AL VAULT" navegan sin dejar listeners ni bucle activos: tras salir, las flechas vuelven a hacer scroll y la consola no muestra errores.
- [ ] En desarrollo (StrictMode) hay una sola nave y una sola velocidad de juego (sin bucle ni listeners duplicados).
- [ ] No hay hydration warnings al cargar `/juegos/asteroids/jugar`.
- [ ] A 375 px de ancho el canvas se escala sin desbordar; con `pointer: coarse` aparece el aviso "REQUIERE TECLADO" y en escritorio no.
- [ ] `references/started-games/asteroids/` no ha cambiado.

---

## Decisiones

- **Sí:** juego nuevo `asteroids` como 9º elemento del catálogo. El usuario indicó que `rocas` no se toca y que este es un juego distinto.
- **No:** reutilizar o reescribir la ficha de `rocas`. Su descripción (OVNIs) no coincide con este juego.
- **Sí:** motor como módulo TS sin globales con `createAsteroidsGame` y `destroy`. Soporta StrictMode, navegación SPA y no deja listeners ni bucle huérfanos.
- **No:** copiar `game.js` con `next/script` o `@ts-nocheck`. Globales y listeners sin cleanup rompen en React.
- **No:** iframe del `index.html` original. No permite pausa ni notificar la puntuación desde el contenedor.
- **Sí:** carpeta `lib/asteroids/` y no `lib/games/asteroids/`, para no convivir con el archivo `lib/games.ts` y evitar ambigüedad de imports `@/lib/games`.
- **Sí:** dos HUDs a la vez (canvas y plataforma), decisión del usuario. El motor notifica y React refleja; el HUD del canvas se mantiene fiel al original.
- **Sí:** pausa también con `Esc`/`P` dentro del juego (decisión del usuario), pero mostrada y etiquetada por el contenedor. El motor detecta la tecla y notifica `status: "paused"`; no hay segundo overlay en el canvas. Un único estado de pausa, dos entradas.
- **Sí:** al actualizar `CLAUDE.md` se actualiza también `README.md` (decisión del usuario). Evita que la tabla de specs de ambos diverja.
- **Sí:** el contenedor controla pausa y game over (decisión del usuario). El motor implementa los estados, pero React los dispara (`pause`, `resume`, `end`, `restart`) y dibuja sus overlays.
- **No:** overlay "GAME OVER" ni reinicio con `Espacio` dentro del canvas. Duplicaría el modal y daría dos formas de reiniciar.
- **Sí:** FIN usa `end()` y pasa por `onGameOver`. Un único camino hacia el modal, sin lógica duplicada en React.
- **Sí:** notificar snapshot solo ante cambios. Evita 60 re-renders por segundo en el reproductor.
- **Sí:** vectores blanco/negro originales dentro del marco CRT (decisión del usuario). Fidelidad al juego; el estilo neón lo aporta el contenedor.
- **No:** reestilizar a neón ni escalar por `devicePixelRatio`. Alcance extra sin pedirse.
- **Sí:** solo teclado con aviso en táctil (decisión del usuario). Controles táctiles merecen spec propia.
- **Sí:** puntuación por el modal existente y `localStorage` (`saveScore`). Supabase, tabla de puntuaciones y ranking real son una spec propia.
- **Sí:** vaciar teclas al pausar, terminar, reiniciar y en `blur`. Evita nave que sigue girando al volver.
- **Sí:** datos mock `best: 0` y `plays: "0"` para el juego nuevo. Todavía no hay puntuaciones reales; no se inventan cifras.
- **Sí:** `GamePlayer` ramifica por `game.id === "asteroids"` en vez de crear una ruta nueva. Reusa el shell (HUD, CRT, modal) sin duplicarlo; los otros juegos no se ven afectados.

---

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta el efecto dos veces y duplica bucle y listeners      | `destroy()` cancela `requestAnimationFrame` y quita todos los listeners; criterio de aceptación de una sola nave/velocidad.         |
| `Espacio` con foco en un botón (PAUSA/FIN) lo activa al disparar      | `preventDefault` en `keydown` y `keyup` de `Espacio` mientras el juego está montado; verificar con Playwright con el foco en PAUSA. |
| `preventDefault` global bloquea el scroll o teclas de otras pantallas | Listeners registrados en `start()` y quitados en `destroy()`; criterio "tras salir las flechas vuelven a hacer scroll".             |
| Teclas pegadas al pausar, abrir el modal o perder foco                | Vaciar el mapa de teclas en esos eventos y en `blur` de la ventana.                                                                 |
| `onState` demasiado frecuente degrada el rendimiento                  | Comparar con el último snapshot y notificar solo si cambia un campo.                                                                |
| Tamaño del `.crt-screen` no respeta 4:3 y deforma el canvas           | Revisar `.crt-screen`/`.game-arena` en el paso 1; fijar `aspect-ratio` en el paso 7 y comprobar a 375 px y escritorio.              |
| Hydration mismatch por aleatoriedad en el render                      | El motor y su `Math.random` solo se ejecutan dentro de `useEffect`; React renderiza solo el `<canvas>` vacío.                       |
| `dt` enorme al volver de otra pestaña teletransporta entidades        | Mantener el `dt` máximo de 0,05 s del original y reiniciar `lastTime` en `resume()`.                                                |
| Ramificar `GamePlayer` por id lo complica con cada juego real futuro  | Aceptado para el primer juego; extraer un registro de reproductores por juego en la spec del segundo juego real.                    |
| Añadir un 9º juego rompe supuestos de "8 tarjetas"                    | Los criterios de SPEC 01 son históricos; la home usa `GAMES.slice(0, 6)` y no cambia; se verifica en los criterios de esta spec.    |

---

## Qué **no** está en esta spec

- Controles táctiles o gamepad.
- Sonido y música.
- OVNIs, estrellas fugaces u otros elementos no presentes en `game.js`.
- Cambios de reglas, balance o estilo visual del original.
- Cambios en el juego `rocas` ni en los otros 7 juegos simulados.
- Supabase, ranking real o lectura de `av_scores`.
- Pausa automática por foco o cambio de pestaña.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
