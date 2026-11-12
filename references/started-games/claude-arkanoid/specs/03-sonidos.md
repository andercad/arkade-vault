# SPEC 03 — Sonidos de rebote y rotura de bloques

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-11-09
> **Objective:** Reproducir `break-sound.mp3` solo cuando se rompe un bloque y `ball-bounce.mp3` cuando la bola rebota en la pala, el techo o las paredes laterales.

---

## Why this spec exists

La SPEC 01 cerró la decisión de no usar sonido en el MVP y dejó los archivos de `assets/sounds/` sin cargar. Esta spec **levanta esa decisión** y añade los dos únicos sonidos disponibles. La SPEC 02 ya dejaba el sonido de rotura fuera de su alcance, así que no hay conflicto con ella.

---

## Scope

**In:**

- Cargar `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` con objetos `Audio` en `game.js`.
- Sonido de rebote (`ball-bounce.mp3`) cuando la bola rebota en la pala, el techo, la pared izquierda o la pared derecha.
- Sonido de rotura (`break-sound.mp3`) cuando se rompe un bloque.
- Golpear un bloque reproduce **solo** el sonido de rotura, nunca el de rebote.
- Cada reproducción clona el `Audio` para que los sonidos se puedan solapar.
- Como máximo un sonido de rebote por frame, aunque la bola toque dos bordes a la vez (esquina).
- Todos los cambios van en `game.js`.

**Out of scope (for future specs):**

- Sonido al perder una vida, game over, victoria, lanzar la bola o cambiar de nivel.
- Música de fondo.
- Ajustes de volumen, botón de silencio o tecla de mute.
- Pausar o cortar los sonidos en reproducción al pausar la partida.
- Archivos de audio nuevos o modificar `assets/sounds/`.
- Precarga con `AudioContext` / Web Audio API.

---

## Data model

```js
// Constantes nuevas (game.js)
const SOUND_BOUNCE_SRC = 'assets/sounds/ball-bounce.mp3';
const SOUND_BREAK_SRC = 'assets/sounds/break-sound.mp3';

// Audios base (se clonan al reproducir)
const sounds = {
  bounce: new Audio(SOUND_BOUNCE_SRC),
  brk: new Audio(SOUND_BREAK_SRC),
};
```

Convenciones:

- `playSound(audio)` clona el audio con `cloneNode()` y llama a `play()`, capturando el error de la promesa para no ensuciar la consola si el navegador bloquea la reproducción.
- Volumen por defecto del elemento `Audio` (1.0); no se ajusta.
- No hay estado nuevo en `game`.

---

## Implementation plan

1. Añadir las constantes, el objeto `sounds` y la función `playSound(audio)` en `game.js`. Prueba manual: tras pulsar Espacio una vez en la página, ejecutar `playSound(sounds.bounce)` en consola hace sonar el rebote y no da errores.
2. Llamar a `playSound(sounds.bounce)` en los rebotes de paredes laterales, techo y pala, con una bandera local por frame para que suene como máximo una vez. Prueba manual: la bola suena al tocar cada uno de los cuatro bordes y la pala; no suena al golpear bloques ni al perder la bola.
3. Llamar a `playSound(sounds.brk)` al romper un bloque, junto a la explosión y las partículas. Prueba manual: cada bloque roto suena una vez y ese golpe no dispara el sonido de rebote.

---

## Acceptance criteria

- [x] La bola rebotando en la pala reproduce `ball-bounce.mp3`.
- [x] La bola rebotando en el techo reproduce `ball-bounce.mp3`.
- [x] La bola rebotando en la pared izquierda y en la derecha reproduce `ball-bounce.mp3`.
- [x] Romper un bloque reproduce `break-sound.mp3` exactamente una vez.
- [x] Golpear un bloque no reproduce `ball-bounce.mp3`.
- [x] Si la bola toca dos bordes en el mismo frame (esquina), suena un único rebote.
- [x] Perder la bola por abajo, la pantalla de inicio, game over, victoria y la pausa no reproducen ningún sonido.
- [x] Varios rebotes o roturas seguidos se oyen solapados sin cortarse y sin errores en la consola.
- [x] Abrir `index.html` con doble clic funciona sin errores de carga de audio en la consola.
- [x] No se ha modificado ningún archivo salvo `game.js`.
- [x] La puntuación, las colisiones, las partículas y el resto del comportamiento de las SPEC 01 y 02 no cambian.

---

## Decisions

- **Sí:** levantar la decisión de la SPEC 01 de no usar sonido. Es petición explícita del usuario y los assets ya existen.
- **Sí:** sonido de rotura solo al romper bloque y rebote en todo lo que no sea bloque. Separa claramente los dos significados.
- **Sí:** clonar el `Audio` en cada evento (`cloneNode()`). Permite solapar sonidos; elegido por el usuario frente a reiniciar `currentTime`.
- **Sí:** máximo un rebote por frame. Evita un doble sonido (más fuerte) en las esquinas.
- **Sí:** `.catch()` en `play()`. Evita errores en consola si el navegador bloquea el audio.
- **Sí:** solo `game.js`. Mantiene el patrón de las SPEC 01 y 02.
- **No:** sonidos en otros eventos. No hay más assets y el usuario solo pidió estos dos.
- **No:** mute o volumen. Ampliaría el alcance con UI y persistencia.
- **No:** Web Audio API. Sobreingeniería para dos efectos cortos.

---

## Risks

| Risk                                                              | Mitigation                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Política de autoplay del navegador bloquea el audio               | Siempre hay un gesto del usuario (Espacio o clic) antes del primer sonido. Además, `play().catch()` lo absorbe. |
| `cloneNode()` genera muchos elementos `Audio` si hay mucha acción | Los clones se liberan al terminar de sonar; los efectos son cortos y el volumen de eventos es bajo.           |
| Sonidos en curso siguen sonando al pausar                         | Aceptado: los efectos son muy cortos. Queda fuera de alcance.                                               |
| Latencia en la primera reproducción                               | Los `Audio` base se crean al cargar el script, así el navegador empieza a descargarlos de inmediato.         |

---

## What is **not** in this spec

- Música de fondo.
- Sonido en perder vida, game over, victoria, lanzamiento o cambio de nivel.
- Volumen, silencio o cualquier ajuste de audio.
- Web Audio API.
- Cambios en los archivos de `assets/`.

Cada uno de ellos, si se aborda, irá en su propia spec.
