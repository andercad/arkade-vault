# SPEC space-invaders-03 — Space Invaders: skins (classic, retro, neon) y sonido con Web Audio

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07, SPEC 08 (patrón de audio de Arkanoid), SPEC 10 (selector de skin en el HUD), game-jam/space-invaders/01-space-invaders-core (el 02 es independiente: no se exige)
> **Fecha:** 2026-11-18
> **Objetivo:** Añadir a Space Invaders tres skins seleccionables en vivo (`lib/space-invaders/skins.ts`) y efectos de sonido sintetizados con Web Audio API, con opción de silencio persistente, sin cambiar el contrato de snapshot.

## Por qué existe esta spec

El core (spec 01) dibuja con una sola paleta verde y es mudo. El género vive del sonido (el latido de la marcha que se acelera, el UFO) y el repo ya tiene los dos patrones: skins con opción `live` en el registro (Tetris, Asteroids, Arkanoid, Snake, Frogger; SPEC 10) y audio en el motor (Arkanoid, SPEC 08). Esta spec los aplica a Space Invaders sin cambiar reglas, balance ni datos.

## Alcance

**Dentro:**

- `lib/space-invaders/skins.ts` con `SKINS`, `DEFAULT_SKIN` y 3 skins: `classic` (por defecto), `retro`, `neon`, todas legibles en modo oscuro.
- `setSkin(name)` en el motor y opción `skin` (`appliesOn: "live"`) en la entrada `spaceInvaders` del registro.
- `lib/space-invaders/audio.ts` con `createSpaceInvadersAudio` (osciladores y ruido, sin archivos) y 8 efectos.
- Opción `sound` (`appliesOn: "live"`, valores `on`/`off`) en el registro, conectada a `setMuted` del motor, y tecla `KeyM` dentro del motor.
- Persistencia del silencio en `localStorage` bajo `av_space_invaders_muted`, leída solo dentro de `createSpaceInvadersGame` (llamado desde `useEffect`).
- Aplicar `/frontend-design` y verificar con Playwright que ninguna skin rompe la legibilidad.

**Fuera de alcance (specs futuras):**

- Música de fondo, voces, volumen graduable, archivos de audio en `public/`.
- Skins con sprites externos o imágenes, editor de skins, skins por nivel.
- Cambios en reglas, formación, puntuación, `games`, `scores`, migraciones, portada y HUD de plataforma.
- Controles táctiles nuevos, Supabase Auth, cambios de esquema, tests automatizados.

## Modelo de datos

```ts
// lib/space-invaders/types.ts (extensión)
export type SkinName = "classic" | "retro" | "neon";

export interface SpaceInvadersGame {
  // ...core
  setSkin(name: SkinName): void; // cambia la paleta en vivo, sin reiniciar
  setMuted(muted: boolean): void;
}

// lib/space-invaders/skins.ts
export interface Skin {
  label: string; // "Classic", "Retro", "Neon"
  background: string; // fondo del campo
  stars: string; // color de las estrellas fijas
  hudText: string;
  hudAccent: string;
  cannon: string;
  playerBullet: string;
  enemyBullet: string;
  invader: [string, string, string]; // calamar, cangrejo, pulpo
  armored: string; // color del blindado (si existe la spec 02)
  shield: string;
  ufo: string;
  boss: string;
  glow: number; // shadowBlur en px, 0 = sin brillo
}
export const SKINS: Record<SkinName, Skin>;
export const DEFAULT_SKIN: SkinName; // "classic"

// lib/space-invaders/audio.ts
export type Sfx =
  | "shoot"
  | "invaderHit"
  | "march"
  | "playerHit"
  | "ufo"
  | "ufoHit"
  | "extraLife"
  | "waveClear"
  | "gameOver";
export interface SpaceInvadersAudio {
  play(sfx: Sfx, variant?: number): void; // variant: 0..3 para las 4 notas de la marcha
  stopUfo(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  destroy(): void; // cierra el AudioContext
}
export function createSpaceInvadersAudio(): SpaceInvadersAudio;
```

```ts
// Opciones nuevas en lib/game-registry.ts (contrato GameOption de lib/game-engine.ts)
// { key: "skin",  label: "Skin",   choices: classic|retro|neon, defaultValue: "classic", appliesOn: "live" }
// { key: "sound", label: "Sonido", choices: on|off,            defaultValue: "on",      appliesOn: "live" }
// setOption: skin → game.setSkin(value as SkinName); sound → game.setMuted(value === "off")
```

Convenciones (valores de diseño nuevos):

- **Skins:**
  - `classic`: fondo `#05060f`, invasores en verdes (`#39ff14`, `#22b80c`, `#8dff6a`), cañón `#39ff14`, escudos `#22b80c`, UFO `#ff3b5c`, `glow = 6`.
  - `retro`: fondo `#000000`, todo monocromo verde fósforo `#33ff33`, sin estrellas, UFO y balas del mismo tono, `glow = 0`; sprites con celdas de 4 px más marcadas.
  - `neon`: fondo `#0a0420`, invasores cian `#00f0ff`, magenta `#ff2bd6` y amarillo `#ffe600`, cañón blanco `#ffffff`, escudos violeta `#9d4dff`, UFO naranja `#ff8a00`, `glow = 14`.
  - El cambio es inmediato (`setSkin` solo sustituye la referencia a la paleta; se redibuja en el siguiente frame, incluso en pausa si el motor redibuja al cambiar).
- **Audio:**
  - `AudioContext` perezoso: se crea en la primera tecla pulsada dentro del motor (política de autoplay), dentro de `createSpaceInvadersAudio`, nunca en render.
  - Volumen máximo de la ganancia maestra: `0,15`.
  - `shoot`: onda cuadrada 880 → 220 Hz en 90 ms. `invaderHit`: ruido corto 60 ms + tono 300 Hz. `playerHit`: ruido 600 ms con barrido descendente. `ufo`: onda sinusoidal que oscila entre 400 y 600 Hz a 8 Hz mientras el UFO está en pantalla (`stopUfo` al salir o ser destruido). `ufoHit`: arpegio ascendente de 3 notas. `extraLife`: 880 Hz doble. `waveClear`: arpegio ascendente de 4 notas. `gameOver`: 3 notas descendentes.
  - `march`: 4 notas graves cíclicas (`55`, `49`, `44`, `41` Hz, onda cuadrada, 80 ms) disparadas en **cada paso de la formación**, de modo que el latido acelera solo al reducirse `stepInterval`.
  - Sin sonido en pausa ni en game over (salvo el `gameOver` único); `pause()` llama a `stopUfo()`.
- **Silencio:** `KeyM` alterna `muted` (pulsación única, ignorando `event.repeat`, ignorada si el `target` es `input`/`textarea`/`select`). Al alternar se escribe `av_space_invaders_muted` (`"1"` silenciado, `"0"` activo) dentro de `try/catch`; si `localStorage` lanza, se ignora. Se lee al crear el motor; el valor inicial de la opción `sound` del registro es `on` y el motor aplica el silencio leído al montarse.
- **Orden en `restart()`:** se conserva skin y silencio actuales; se cancela el sonido del UFO.
- `destroy()` cancela el sonido, cierra el `AudioContext` (con `catch` si ya estaba cerrado) y quita todos los listeners.

Estructura de archivos:

```
lib/space-invaders/skins.ts    // Skin, SKINS, DEFAULT_SKIN
lib/space-invaders/audio.ts    // createSpaceInvadersAudio
lib/space-invaders/types.ts    // SkinName, setSkin, setMuted
lib/space-invaders/engine.ts   // paleta activa, llamadas a audio, KeyM
lib/game-registry.ts           // opciones skin y sound + setOption
```

## Plan de implementación

1. **Skins.**
   - Crear `lib/space-invaders/skins.ts` con la interfaz `Skin`, las 3 paletas y `DEFAULT_SKIN`; añadir `SkinName` y `setSkin` a `types.ts`.
   - Verificación: `npx tsc --noEmit`; `SKINS` tiene `classic`, `retro` y `neon`.
2. **Motor con paleta.**
   - Sustituir los colores fijos de `draw` por los de la skin activa (fondo, estrellas, HUD, cañón, invasores por tipo, escudos, UFO, balas); aplicar `shadowBlur = glow` y restaurarlo; implementar `setSkin`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; con `classic` el aspecto del core no cambia.
3. **Registro: opción de skin.**
   - Añadir la opción `skin` (`live`) a la entrada `spaceInvaders` en `lib/game-registry.ts` y su rama en `setOption`, sin ramas por `game.id` en `GamePlayer`.
   - Verificación: el selector aparece dentro del HUD (SPEC 10); cambiar de skin en partida recolorea en vivo sin reiniciar.
4. **Audio.**
   - Crear `lib/space-invaders/audio.ts` con los 9 efectos, ganancia maestra 0,15, `setMuted`, `stopUfo` y `destroy()`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; sin acceso a `window` ni `AudioContext` fuera de funciones.
5. **Integrar audio en el motor.**
   - Disparar sfx en disparo, impacto a invasor, paso de marcha (nota cíclica), muerte del cañón, UFO (inicio y destrucción), vida extra, oleada superada y game over; crear el contexto en la primera tecla; `KeyM`, persistencia en `av_space_invaders_muted` y `setMuted`.
   - Verificación: sin errores de autoplay en consola; con silencio no suena nada; el latido acelera al quedar pocos invasores.
6. **Registro: opción de sonido y documentación.**
   - Añadir la opción `sound` (`on`/`off`, `live`) al registro y su rama en `setOption`; añadir esta spec a `CLAUDE.md` y `README.md`.
   - Verificación: la opción y `KeyM` se mantienen coherentes tras recargar; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `space-invaders-skins-audio: Paso N`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] Sin cambios en `games`, `scores`, migraciones ni portada; el snapshot y el `hud` del adaptador no cambian.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings; en desarrollo (StrictMode) hay una sola instancia y un solo `AudioContext`.
- [ ] Pausa, FIN, game over, "JUGAR DE NUEVO" y guardado funcionan igual que en la spec 01; `Esc`/`P` siguen alternando la pausa.
- [ ] `destroy()` cierra el `AudioContext` y quita listeners; "SALIR" no deja sonido ni bucle activos.
- [ ] Al perder la última vida se emite `lives = 0` y después `onGameOver(score)` una sola vez.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y el núcleo de Space Invaders siguen funcionando igual.

**Específicos de Space Invaders:**

- [ ] El selector "Skin" muestra Classic, Retro y Neon con Classic por defecto; cambiar de skin recolorea el canvas en vivo sin reiniciar ni perder puntos.
- [ ] Con `classic` el aspecto coincide con el del core; `retro` no usa estrellas y es monocromo; `neon` usa el brillo de 14 px y los colores definidos.
- [ ] Los invasores, el cañón, los escudos y las balas son distinguibles entre sí en las tres skins.
- [ ] El `AudioContext` no existe hasta la primera tecla pulsada.
- [ ] Hay sonido en disparo, impacto, muerte del cañón, UFO, vida extra, oleada superada y game over; el UFO suena mientras cruza y se corta al salir o ser destruido.
- [ ] El latido de la marcha emite una nota por paso de la formación, en ciclo de 4 notas, y acelera a medida que baja `stepInterval`.
- [ ] `KeyM` y la opción "Sonido" alternan el silencio; el estado persiste en `av_space_invaders_muted` y se aplica al recargar.
- [ ] En pausa no suena nada; al reanudar el latido continúa.
- [ ] `restart()` conserva la skin y el silencio elegidos.
- [ ] Si `localStorage` lanza error, el juego sigue funcionando sin persistir el silencio.

## Decisiones

- **Sí:** 3 skins (`classic`, `retro`, `neon`) con opción `live`. Razón: patrón de Tetris y de los demás juegos (SPEC 10); el selector vive en el HUD sin tocar `GamePlayer`.
- **Sí:** Web Audio API con osciladores. Razón: sin assets ni librerías nuevas; control de volumen y silencio, igual que Arkanoid.
- **Sí:** latido de marcha atado al paso de la formación. Razón: acelerar con la dificultad sin lógica de tempo adicional.
- **Sí:** opción `sound` en el registro además de `KeyM`. Razón: accesible con ratón y táctil, ya que el mando no emite `KeyM`.
- **Sí:** silencio persistido en `localStorage` con clave propia `av_space_invaders_muted`. Razón: preferencia del jugador; se lee y escribe solo en cliente y dentro de `try/catch`.
- **Sí:** mantener 3 vidas, el orden `lives = 0` antes de `onGameOver` y el HUD doble del core. Razón: estas specs no alteran reglas ni contrato.
- **No:** música de fondo y volumen graduable. Razón: alcance acotado; archivos de audio añadirían assets.
- **No:** persistir la skin elegida. Razón: coherencia con los demás juegos (la opción se reinicia al recargar).
- **No:** tocar `components/game-player.tsx`, `touch-controls.tsx` ni reglas del juego.
- **No:** controles táctiles nuevos, Supabase Auth ni cambios de esquema.

## Riesgos

| Riesgo                                                      | Mitigación                                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Autoplay bloquea el audio                                   | `AudioContext` creado o reanudado en la primera tecla dentro del motor; un fallo se ignora sin romper el juego |
| `AudioContext` duplicado por StrictMode                     | `destroy()` lo cierra; bandera `destroyed`; criterio de un solo contexto                                       |
| El latido molesta o satura                                  | Ganancia maestra 0,15, notas de 80 ms y silencio accesible por `KeyM` y por opción                             |
| Skin con poco contraste en modo oscuro                      | Fondos oscuros definidos, verificación con Playwright en las 3 skins                                           |
| `shadowBlur` degrada el rendimiento en `neon`               | `glow` acotado a 14 px y restaurado a 0 tras dibujar cada grupo                                                |
| El mando táctil no puede pulsar `KeyM`                      | Opción `sound` del registro como vía alternativa                                                               |
| `localStorage` desactivado o lanza                          | `try/catch`; el juego sigue sin persistir                                                                      |
| Estado de la opción `sound` y el valor persistido discrepan | El motor aplica el valor guardado al montarse y `setOption` solo escribe al cambiar; criterio de recarga       |

## Qué **no** está en esta spec

- Música de fondo, voces, volumen graduable y archivos de audio.
- Skins con imágenes, editor de skins y persistencia de la skin.
- Cambios de reglas, formación, puntuación, registro más allá de las dos opciones, migraciones y portada.
- Controles táctiles nuevos, Supabase Auth, cambios de esquema en `games`/`scores` y tests automatizados.

Cada uno, si llega, va en su propia spec.
