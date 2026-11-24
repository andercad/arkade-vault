# SPEC sokoban-02 — SOKOBAN: animación de empuje, partículas y sonido

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 14, sokoban-01 (`01-sokoban-core.md`)
> **Fecha:** 2026-11-24
> **Objetivo:** Añadir al motor de Sokoban deslizamiento suave del operario y las cajas, rebote al chocar, partículas al colocar cajas, transición entre niveles y efectos de sonido con Web Audio API, controlados por una opción de sonido de la plataforma.

## Por qué existe esta spec

El spec 01 deja el juego completo pero seco: cada paso teletransporta al operario y a la caja, no hay feedback al chocar contra un muro y completar un nivel solo muestra un banner. En un puzle por turnos, el feedback visual y sonoro es lo que comunica si un empuje ha funcionado. Esta spec lo añade sin tocar las reglas, la puntuación ni el contrato `GameSnapshot`.

Patrones reales del repo: efectos de sonido con Web Audio y opción de plataforma como en la spec de peligros y audio de Frogger (`specs/game-jam/frogger/03-frogger-hazards-audio.md`), opciones `GameOption` en `lib/game-registry.ts` (Tetris/Snake) y cachés de `lib/canvas-cache.ts` (SPEC 14).

## Alcance

**Dentro:**

- Interpolación visual (tween) de 90 ms del operario y de la caja empujada; la lógica sigue siendo instantánea y la entrada nunca se bloquea.
- Rebote de 80 ms del operario al intentar un paso inválido (muro, caja bloqueada).
- Partículas al colocar una caja sobre una marca (máximo 24 simultáneas) y destello breve de la marca.
- Transición entre niveles: el banner del spec 01 aparece con fundido y un barrido de franjas cian durante los 0,8 s existentes; sin cambiar su duración.
- Sonido con Web Audio API (osciladores, sin archivos): paso, empuje, caja colocada, bloqueo, deshacer, reinicio, nivel completado y victoria.
- Opción de plataforma `sound` ("Sonido": Sí/No, `appliesOn: "live"`) conectada a `setOption` del motor.
- Respeto de `prefers-reduced-motion`: sin tween, rebote ni partículas (el sonido sigue).
- Pausa congela animaciones, partículas y audio.

**Fuera de alcance (specs futuras):**

- Música de fondo, sprites propios en `public/games/sokoban/`, skins, selector de nivel y nuevos niveles.
- Persistencia del estado de sonido en `localStorage`, tecla `M` de mute.
- Cambios en las reglas, la puntuación, `games`, `scores`, migraciones o portada.
- Controles táctiles nuevos (el mando del spec 01 no cambia), Supabase Auth, cambios de esquema, tests automatizados.

## Modelo de datos

```ts
// lib/sokoban/types.ts (extensión)
export interface Tween {
  fromX: number; // celda lógica de origen (continua)
  fromY: number;
  t: number; // 0..1; 1 = terminado
}

export interface Particle {
  x: number; // px del canvas
  y: number;
  vx: number; // px/s
  vy: number;
  ttl: number; // segundos restantes
  color: string;
}

// lib/sokoban/audio.ts
export type Sfx =
  | "step"
  | "push"
  | "placed"
  | "blocked"
  | "undo"
  | "reset"
  | "level"
  | "victory";

export interface SokobanAudio {
  unlock(): void; // crea/reanuda el AudioContext tras la primera tecla
  play(sfx: Sfx): void;
  setMuted(m: boolean): void;
  suspend(): void; // pausa del juego
  resume(): void;
  destroy(): void; // cierra el AudioContext
}
export function createSokobanAudio(): SokobanAudio;
```

```ts
// Opción de plataforma añadida en lib/game-registry.ts (contrato GameOption existente)
// { key: "sound", label: "Sonido", choices: [{ value: "on", label: "Sí" }, { value: "off", label: "No" }],
//   defaultValue: "on", appliesOn: "live" }
// El setOption del adaptador llama a game.setMuted(value === "off").
```

Estructura de archivos nueva y modificada:

```
lib/sokoban/audio.ts        // createSokobanAudio
lib/sokoban/constants.ts    // + MOVE_ANIM_MS, BUMP_MS, BUMP_PX, PARTICLE_MAX, PARTICLE_TTL, SFX_VOLUME
lib/sokoban/types.ts        // + Tween, Particle; SokobanGame gana setMuted(m: boolean)
lib/sokoban/engine.ts       // tween, rebote, partículas, transición, integración de audio
lib/game-registry.ts        // opción "sound" + setOption (única modificación de plataforma)
```

Convenciones (valores de diseño nuevos):

- Constantes: `MOVE_ANIM_MS = 90`, `BUMP_MS = 80`, `BUMP_PX = 4`, `PARTICLE_MAX = 24`, `PARTICLE_TTL = 0.5`, `SFX_VOLUME = 0.15` (ganancia máxima).
- Tween: al aplicar un paso válido se guardan el origen visual del operario y, si empujó, de la caja; el dibujo interpola linealmente con `t = min(1, elapsed / 90 ms)`. Un paso nuevo antes de terminar parte de la posición visual actual (sin saltos). Deshacer y reinicio de nivel colocan las posiciones al instante (sin tween) para que mantener `Z` sea ágil.
- Rebote: un paso inválido desplaza el dibujo del operario `BUMP_PX` hacia la dirección intentada y vuelve en 80 ms (triángulo); no cambia la lógica ni cuenta movimiento. Un rebote en curso no se reinicia con otro intento.
- Partículas: al colocar una caja sobre una marca nace una ráfaga de 8 partículas cian/blancas en el centro de la celda, con velocidad aleatoria de 40–120 px/s en cualquier dirección y `ttl` 0,5 s. Si el total superaría 24, se descartan las más antiguas. Se pintan con `fillRect` de 3×3 px y `globalAlpha = ttl / 0,5`, sin `shadowBlur`. Retirar una caja de una marca (deshacer o empujar fuera) no genera partículas. `Math.random` solo se usa en las partículas, dentro de `createSokobanGame`.
- Destello de marca: la marca de la caja recién colocada se dibuja con un anillo extra que se desvanece en 0,3 s (dibujado en la capa dinámica, no en la estática).
- Transición de nivel: durante el estado `clear` (0,8 s del spec 01) el banner entra con `globalAlpha` de 0 a 1 en los primeros 0,2 s y se mantiene; sobre el tablero se barren 6 franjas verticales cian semitransparentes de izquierda a derecha. Al cargar el nivel siguiente el tablero aparece sin franjas.
- Sonido (osciladores con envolvente de ganancia; volumen máximo 0,15):
  - `step`: triangle 220 Hz, 25 ms, ganancia 0,05.
  - `push`: square 110→80 Hz, 90 ms.
  - `placed`: arpegio 523→784 Hz, dos notas de 70 ms.
  - `blocked`: sawtooth 140 Hz, 70 ms, ganancia 0,08.
  - `undo`: triangle 392→294 Hz, 70 ms.
  - `reset`: triangle 330→165 Hz, 160 ms.
  - `level`: arpegio ascendente de 4 notas (523, 659, 784, 1046 Hz), 90 ms cada una.
  - `victory`: arpegio de 6 notas ascendentes más acorde final de 300 ms.
- `AudioContext` se crea de forma perezosa en `unlock()`, llamado en el primer `keydown` tras `start()` (política de autoplay), nunca durante el render. Si no existe `AudioContext`, `play` no hace nada. Al pausar se llama a `suspend()` y al reanudar a `resume()`; el mute usa un `GainNode` maestro.
- Orden de sonidos por paso: empuje válido suena `push` (y `placed` si deja una caja sobre una marca, sustituyendo a `push`); paso sin empuje suena `step`; paso inválido suena `blocked`; el último `placed` de un nivel va seguido de `level` (o `victory` en el nivel 5) al empezar el banner. Con teclas mantenidas, `step` suena en cada repetición.
- El estado de sonido no se persiste: la opción `sound` de la plataforma es la única fuente (valor inicial "Sí"). Razón y alternativas, en Decisiones.
- `prefers-reduced-motion: reduce` se lee una vez con `matchMedia` dentro de `createSokobanGame`; si es verdadero, `MOVE_ANIM_MS` y `BUMP_MS` valen 0 y no se crean partículas ni franjas.
- Todas las animaciones avanzan con el `dt` limitado a 0,05 s del bucle, de modo que la pausa las congela y `resume()` no produce saltos.

## Plan de implementación

1. **Constantes y tipos de animación.**
   - Leer `lib/canvas-cache.ts`, `components/touch-controls.tsx` y la sección de opciones de `lib/game-registry.ts` (Tetris/Snake) como patrón.
   - Añadir las constantes de animación a `lib/sokoban/constants.ts` y `Tween`, `Particle` y `setMuted` a `lib/sokoban/types.ts`.
   - Verificación: `npx tsc --noEmit`.
2. **Módulo de audio.**
   - Crear `lib/sokoban/audio.ts` con `createSokobanAudio`: contexto perezoso, `GainNode` maestro, un oscilador con envolvente por `Sfx`, `suspend/resume`, `setMuted` y `destroy()` que cierra el contexto.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; ningún acceso a `window` fuera de `createSokobanAudio` y sus métodos.
3. **Tween y rebote.**
   - En `lib/sokoban/engine.ts`, guardar el origen visual al aplicar un paso y dibujar operario y caja interpolados; rebote en pasos inválidos; sin tween en deshacer y reinicio; `prefers-reduced-motion` desactiva ambos.
   - Verificación: mantener una flecha desliza con suavidad sin acumular retraso lógico; un muro hace rebotar al operario sin sumar movimientos.
4. **Partículas y destello.**
   - Lista de partículas con tope de 24, ráfaga al colocar una caja, actualización con `dt` y destello de la marca en la capa dinámica.
   - Verificación: colocar una caja produce la ráfaga; deshacer no; nunca hay más de 24 partículas.
5. **Transición de nivel.**
   - Fundido del banner y franjas de barrido durante el estado `clear`; sin alterar su duración de 0,8 s ni la entrada ignorada.
   - Verificación: al completar un nivel se ve el barrido y el siguiente nivel carga a los 0,8 s.
6. **Integrar el audio en el motor.**
   - Disparar cada `Sfx` según las reglas de orden, llamar a `unlock()` en el primer `keydown`, `suspend()`/`resume()` junto a pausa y reanudación, y `destroy()` del audio dentro del `destroy()` del motor.
   - Verificación: sin errores de autoplay en la consola; en pausa no suena nada.
7. **Opción de sonido en el registro.**
   - Exponer `setMuted` en `createSokobanGame` y añadir a `sokoban` en `lib/game-registry.ts` la opción `sound` (`live`) y su `setOption` (única modificación de plataforma, sin ramas por `game.id`).
   - Verificación: el selector "Sonido" aparece en el HUD del reproductor y "No" silencia todos los efectos; `npm run lint` y `npm run build` pasan.

Cada paso = un commit `sokoban-02: Paso N`.

## Criterios de aceptación

**Genéricos:**

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] Sin cambios en `games`, `scores`, migraciones ni portada.
- [ ] El canvas arranca sin errores en la consola ni hydration warnings; en StrictMode hay una sola instancia.
- [ ] `PAUSA`/`REANUDAR`, `Esc` y `P` siguen comportándose como en el spec 01; la pausa no deja teclas pegadas.
- [ ] "SALIR" y "VOLVER AL VAULT" cierran el `AudioContext` y no dejan listeners ni bucle activos.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y las reglas y puntuación de Sokoban del spec 01 siguen funcionando igual.
- [ ] A 375 px el canvas no desborda y el mando táctil sigue manejando el juego, ahora con sonido tras el primer toque.

**Específicos de Sokoban:**

- [ ] Un paso válido desliza al operario (y a la caja empujada) en 90 ms; tras cualquier secuencia de pulsaciones el estado lógico coincide con el del spec 01 (los tweens son solo visuales).
- [ ] Mantener una dirección sigue repitiendo cada 110 ms sin acumular retraso entre el dibujo y la lógica.
- [ ] Deshacer y reiniciar el nivel colocan operario y cajas al instante, sin tween.
- [ ] Un paso inválido hace rebotar al operario 4 px durante 80 ms, no cuenta movimiento y suena `blocked`.
- [ ] Colocar una caja sobre una marca lanza 8 partículas y un destello de 0,3 s; con 24 partículas vivas no se añaden más; retirar una caja no genera partículas.
- [ ] El banner de nivel completado entra con fundido y 6 franjas cian barren el tablero; el nivel siguiente carga igualmente a los 0,8 s.
- [ ] Hay sonido distinto para paso, empuje, caja colocada, bloqueo, deshacer, reinicio, nivel y victoria; el contexto de audio se crea tras la primera tecla.
- [ ] La opción "Sonido" del reproductor ("Sí" por defecto) con "No" silencia todos los efectos al instante, también los que están sonando, y "Sí" los restablece.
- [ ] Pausar congela animaciones y partículas y suspende el audio; al reanudar no hay saltos ni sonidos atrasados.
- [ ] Con `prefers-reduced-motion: reduce` no hay tween, rebote, partículas ni franjas, y el juego es igualmente jugable.
- [ ] Los sprites y el relleno de partículas no usan `shadowBlur` por objeto y el juego mantiene ≥58 FPS con CPU ×6 en `npm run perf` si se ejecuta (SPEC 14).

## Decisiones

- **Sí:** tween solo visual, con la lógica instantánea. Razón: las reglas del spec 01 y los criterios de puntuación no cambian; la entrada nunca queda bloqueada por una animación.
- **Sí:** sin tween en deshacer y reinicio. Razón: mantener `Z` debe retroceder rápido; animar cada deshacer lo haría pesado.
- **Sí:** Web Audio API con osciladores. Razón: sin assets ni librerías nuevas, control de volumen y mute (patrón de Frogger spec 03).
- **Sí:** opción de plataforma `sound` con `GameOption` (`live`), sin persistencia en `localStorage`. Razón: `GamePlayer` inicializa los selectores desde `defaultValue`; persistir en otra clave podría desincronizar el selector y el motor, y no añade valor frente al coste. Si más adelante se persiste el estado de las opciones de forma genérica, se hará en otra spec.
- **No:** tecla `M` de mute. Razón: no se podría reflejar en el selector del HUD sin cambiar el contrato de `GamePlayer`.
- **Sí:** `prefers-reduced-motion` desactiva los efectos visuales y no el sonido. Razón: accesibilidad; el sonido ya se controla con la opción.
- **Sí:** tope de 24 partículas con descarte de las más antiguas. Razón: coste de dibujo acotado (mismo tope que la spec de Frogger).
- **Sí:** mantener el HUD doble y las reglas de vidas del spec 01 (sin vidas). Razón: esta spec no añade datos al HUD ni alcanza la derrota.
- **Sí:** el orden `status: "gameover"` antes de `onGameOver(score)` del spec 01 no cambia. Razón: no alterar el contrato; el sonido `victory` suena al empezar el banner del último nivel.
- **No:** música de fondo, sprites propios y skins. Razón: alcance acotado; las skins las aplica el flujo posterior (`skin-designer`).

## Riesgos

| Riesgo                                                             | Mitigación                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Política de autoplay bloquea el audio                              | Crear/reanudar el `AudioContext` en el primer `keydown` (`unlock()`); si falla, `play` no hace nada.                |
| El tween desincroniza lo dibujado y el estado lógico               | Los tweens solo interpolan posiciones de dibujo; criterio de aceptación contra la lógica del spec 01.               |
| Mantener una tecla acumula pasos visuales encadenados              | Un paso nuevo parte de la posición visual actual y el repeat (110 ms) es mayor que el tween (90 ms).                |
| `AudioContext` queda abierto al salir                              | `destroy()` del motor cierra el contexto; criterio de aceptación al SALIR.                                          |
| Sonidos solapados saturan o distorsionan                           | Ganancia máxima 0,15, envolvente corta y `GainNode` maestro.                                                        |
| Partículas o franjas penalizan el rendimiento con CPU ×6           | Tope de 24, `fillRect` sin `shadowBlur`; medir con `npm run perf` y recortar efectos si baja de 58 FPS.             |
| El selector "Sonido" no aparece o se desincroniza al reiniciar     | `appliesOn: "live"` y `setOption` llama a `setMuted`; comprobar que "JUGAR DE NUEVO" conserva el estado elegido.    |
| Usuarios sensibles al movimiento                                   | `prefers-reduced-motion` desactiva tween, rebote, partículas y franjas.                                             |

## Qué **no** está en esta spec

- Música de fondo, sprites propios, skins, selector de nivel y niveles nuevos.
- Persistencia del sonido en `localStorage` y tecla `M`.
- Cambios en reglas, puntuación, `games`, `scores`, migraciones o portada.
- Controles táctiles nuevos, Supabase Auth, cambios de esquema y tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propia spec.
