# SPEC — Frogger: peligros especiales, bonos y sonido

> **Estado:** Propuesto
> **Depende de:** 06-games-table-leaderboard-supabase (SPEC 06), game-jam/frogger/01-frogger-core, game-jam/frogger/02-frogger-platform
> **Fecha:** 2026-11-17
> **Objetivo:** Añadir al motor de Frogger moscas bonus, cocodrilos en las casas, serpientes en la mediana y efectos de sonido con Web Audio API, sin cambiar el contrato con la plataforma.

## Scope

**In:**

- Mosca bonus: aparece en una casa libre aleatoria cada 8–14 s y dura 5 s; llegar a ella suma +200.
- Cocodrilo en casa: desde el nivel 2, una casa libre muestra un cocodrilo (mandíbulas abiertas = muerte) durante 4 s, alternando; no coincide con la mosca.
- Serpiente en la mediana (fila 6): desde el nivel 3, cruza horizontalmente a 2 celdas/s; tocarla = muerte.
- Sonido con Web Audio API (osciladores, sin archivos): salto, atropello, chapuzón, casa llena, nivel, vida extra, game over.
- Mute interno persistido en `localStorage` (`av_frogger_muted`), por tecla `KeyM` dentro del canvas o botón de opción de plataforma (`GameOption`).
- Partículas simples en muertes (salpicadura de agua y chispas), máximo 24 partículas.

**Fuera de alcance:**

- Cambios en `games`, `scores`, registro o portada (spec 02).
- Música de fondo, skins, power-ups y jefes.
- Controles táctiles/mobile, Supabase Auth/RLS, Realtime en leaderboard.
- Tests automatizados.

## Data model

```ts
// lib/frogger/types.ts (extensión)
export type HazardKind = "fly" | "croc" | "snake";

export interface Hazard {
  kind: HazardKind;
  col: number; // fly/croc: columna de casa; snake: x continuo
  row: number;
  ttl: number; // segundos restantes (fly/croc)
}

// lib/frogger/audio.ts
export type Sfx =
  "hop" | "splat" | "splash" | "home" | "level" | "life" | "over";
export interface FroggerAudio {
  play(sfx: Sfx): void;
  setMuted(m: boolean): void;
  isMuted(): boolean;
  destroy(): void; // cierra AudioContext
}
export function createFroggerAudio(): FroggerAudio;
```

```ts
// Opción de plataforma (contrato GameOption existente en lib/game-engine.ts)
// { id: "sound", label: "SONIDO", ... } alterna mute; el motor expone setMuted()
```

Reglas de diseño:

- `AudioContext` se crea de forma perezosa en la primera tecla pulsada (política de autoplay) y dentro de `createFroggerAudio`, nunca durante el render.
- Frecuencias: salto 440→660 Hz 60 ms (square); atropello ruido corto 120 ms; chapuzón 300→100 Hz 200 ms; casa 523→784→1046 Hz arpegio; nivel arpegio ascendente de 4 notas; vida extra 880 Hz doble; game over 3 notas descendentes. Volumen máximo 0,15.
- El mute se lee de `localStorage` al crear el motor (en `useEffect`) y se escribe solo al alternar. Si `localStorage` lanza error, se ignora.
- Mosca: puntuación +200 al llenar la casa con mosca viva, sumada a la de casa (+50 + tiempo).
- Cocodrilo: no se genera si queda una sola casa libre (siempre debe existir una casa segura).
- Serpiente: nace al inicio de cada vida en un lado aleatorio de la fila 6 y envuelve; pausada con el juego.
- Partículas: posición, velocidad y `ttl` 0,5 s; se actualizan con `dt` limitado.
- Eventos de peligro se pintan sobre el tablero del spec 01 y el contrato de snapshot no cambia (solo se añaden entradas de dibujo y sonido).

## Implementation plan

1. **Audio.**
   - Crear `lib/frogger/audio.ts` con `createFroggerAudio` (osciladores y envolvente de ganancia), mute y `destroy()`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`; sin acceso a `window` fuera de funciones.
2. **Integrar audio en el motor.**
   - Disparar sfx en salto, muerte por vehículo o agua, casa, nivel, vida extra y game over; crear el contexto tras el primer input; `destroy()` del audio dentro de `destroy()` del motor.
   - Verificación: sin errores de autoplay en consola; mute silencia todo.
3. **Mosca y cocodrilo.**
   - Temporizadores de aparición, exclusión mutua, reglas por nivel y dibujo con primitivas.
   - Verificación: la mosca da +200 y expira; el cocodrilo mata solo con la boca abierta y nunca bloquea la última casa libre.
4. **Serpiente de mediana y partículas.**
   - Entidad con wrap y colisión AABB; partículas en muertes con tope de 24.
   - Verificación: la mediana deja de ser segura desde el nivel 3; sin fugas de partículas.
5. **Opción de mute.**
   - Exponer `setMuted` y conectarlo a `GameOption` del registro (única modificación de plataforma permitida: añadir la opción, sin ramas por `game.id`) y a `KeyM`.
   - Verificación: el estado persiste tras recargar (`av_frogger_muted`).

Cada paso = un commit `frogger-hazards-audio: Paso N`.

## Acceptance criteria

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] Sin cambios en `games`, `scores`, migraciones ni portada.
- [ ] La mosca aparece en una casa libre cada 8–14 s, dura 5 s y suma +200 al llegar; no aparece en casas llenas.
- [ ] Desde el nivel 2 aparece un cocodrilo en una casa libre alternando cada 4 s; solo mata con la boca abierta; nunca queda la última casa libre bloqueada.
- [ ] Desde el nivel 3 la serpiente cruza la mediana a 2 celdas/s y mata al tocarla; no existe en niveles 1–2.
- [ ] Hay sonido en salto, atropello, chapuzón, casa, nivel, vida extra y game over; el contexto de audio se crea tras el primer input.
- [ ] El mute (`KeyM` y opción de plataforma) silencia todos los efectos, persiste en `av_frogger_muted` y se aplica al recargar.
- [ ] Pausar congela peligros, partículas y temporizadores; no suena nada en pausa.
- [ ] Las partículas nunca superan 24 simultáneas.
- [ ] `destroy()` cierra el `AudioContext` y quita listeners; sin errores en StrictMode.
- [ ] `onLivesChange(0)` (snapshot con `lives = 0`) sigue emitiéndose antes que `onGameOver(score)`.
- [ ] Asteroids, Tetris, Arkanoid, Snake y el núcleo de Frogger siguen funcionando igual.

## Decisions

- **Sí:** Web Audio API con osciladores. Razón: sin assets ni librerías nuevas; control total de volumen y mute.
- **Sí:** peligros añadidos por nivel (2 cocodrilo, 3 serpiente). Razón: dificultad progresiva sin rediseñar los carriles del spec 01.
- **Sí:** nunca bloquear la última casa libre. Razón: evitar niveles imposibles de completar.
- **Sí:** mute persistido en `localStorage` bajo clave propia `av_frogger_muted`. Razón: preferencia de usuario; se lee y escribe solo desde el cliente.
- **Sí:** mantener 3 vidas y el orden `lives = 0` antes de `onGameOver` del spec 01. Razón: no alterar el contrato.
- **Sí:** HUD doble sin cambios. Razón: los extras no añaden datos al HUD.
- **No:** música de fondo, skins, power-ups y jefes. Razón: alcance acotado.
- **No:** controles táctiles, Supabase Auth/RLS, Realtime en leaderboard ni cambios de esquema.
