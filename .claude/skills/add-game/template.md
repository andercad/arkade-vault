# Plantilla de spec para un juego nuevo

Referencia que consulta `/add-game`. **No se copia literal**: es la forma que debe respetar la spec generada. Esta plantilla **complementa** a la del skill `/spec` (`.claude/skills/spec/template.md`), que se lee siempre antes y manda en formato, secciones y reglas de redacción; aquí solo se concreta el contenido propio de un juego. Reglas técnicas: `checklist.md`.

Sustituye `<slug>`, `<Juego>` y los datos entre `<>` por los del juego.

---

````markdown
# SPEC NN — <Juego>: <frase corta>

> **Estado:** Borrador
> **Depende de:** SPEC 01, SPEC 05, SPEC 06 (+ las que apliquen)
> **Fecha:** <hoy>
> **Objetivo:** <una frase: portar/crear <Juego> como juego real en la plataforma, con leaderboard>

## Por qué existe esta spec

<Origen: references/started-games/<carpeta> (inventario: globales, listeners, DOM ids, overlays, localStorage con `archivo:línea`) o juego nuevo. Qué no puede pegarse tal cual en React.>

## Alcance

**Dentro:**

- Motor en `lib/<slug>/` (port fiel / diseño nuevo) con `create<Juego>Game`.
- Fila `<slug>` en `games` por migración; portada `cover-<slug>`.
- Integración en el reproductor (registro genérico) con HUD de plataforma: <campos>.
- `touchControls` en el registro (d-pad + 0-2 botones de acción que emiten las teclas del juego, ver SPEC 12).
- Pausa por botón y por `<teclas>`, FIN, game over, guardado con `submitScore`.
- Añadir la spec a `CLAUDE.md` y `README.md` en el mismo cambio.

**Fuera de alcance (specs futuras):**

- <Extras del original no portados: menús, skins, sonido, selector de nivel…>
- Gestos sobre el canvas, cambios de reglas/balance, Supabase Auth, otros juegos, tests.

## Modelo de datos

```ts
// lib/<slug>/types.ts
export type <Juego>Status = "playing" | "paused" | "gameover"; // + propios
export interface <Juego>Snapshot { score: number; /* campos HUD */ status: <Juego>Status }
export function create<Juego>Game(canvas: HTMLCanvasElement, callbacks: ...): ...;
```

```sql
-- supabase/migrations/NNNN_seed_<slug>.sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
-- <color> = CATEGORY_COLOR[<CAT>] (SPEC 15), no se elige
values ('<slug>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<slug>', '<color>', <n>);
```

Estructura de archivos nueva y convenciones (teclas, constantes del original con su valor, puntuación, rango de score).

## Plan de implementación

Cada paso lleva dos listas: **Acciones** y **Verificaciones** (observables: comando, URL, consulta o comportamiento).

1. **Lectura previa.**
   - **Acciones:**
     - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md).
     - Revisar `components/game-player.tsx` y el CSS de `.crt-screen`.
   - **Verificaciones:**
     - Sin cambios de código.
     - `git status` limpio.
2. **Contrato común** _(solo si `lib/game-registry.ts` no existe)_.
   - **Acciones:**
     - Crear `lib/game-engine.ts` (`GameEngine`, `GameSnapshot` con `score`, `status` y `hud` de pares etiqueta/valor, `GameCallbacks`).
     - Crear `lib/game-registry.ts` (id → `create`, ancho, alto, `aria`).
     - Crear `components/game-canvas.tsx` genérico y dejar `GamePlayer` sin ramas por id.
     - Adaptar Asteroids sin cambiar su comportamiento.
   - **Verificaciones:**
     - Asteroids pasa los criterios de SPEC 05.
3. **Constantes, utils y tipos.**
   - **Acciones:**
     - Crear `lib/<slug>/constants.ts`, `utils.ts` y `types.ts`.
   - **Verificaciones:**
     - `npx tsc --noEmit` sin errores.
4. **Entidades** _(si aplica)_.
   - **Acciones:**
     - Crear `lib/<slug>/entities.ts`.
   - **Verificaciones:**
     - `npx tsc --noEmit` sin errores.
     - `npm run lint` sin errores.
5. **Motor.**
   - **Acciones:**
     - Crear `lib/<slug>/engine.ts` con estado, update/draw e input con cleanup.
     - Implementar `pause/resume/restart/end/destroy`.
     - Emitir snapshot solo ante cambios.
   - **Verificaciones:**
     - `npx tsc --noEmit` sin errores.
     - `npm run lint` sin errores.
6. **Registro del juego.**
   - **Acciones:**
     - Registrar el juego en `lib/game-registry.ts`.
     - Definir `touchControls` (solo las direcciones y acciones que usa el juego).
   - **Verificaciones:**
     - `/juegos/<slug>/jugar` monta el canvas.
     - Con emulación táctil aparece el mando.
7. **Migración seed.**
   - **Acciones:**
     - Crear `supabase/migrations/NNNN_seed_<slug>.sql` con el `color` de `CATEGORY_COLOR[<CAT>]` (mapa de `checklist.md`).
     - Aplicarla con `apply_migration`.
     - Regenerar `database.types.ts` si hace falta.
   - **Verificaciones:**
     - `list_migrations` muestra la migración.
     - `select id, cat, color from games` devuelve el color del mapa.
     - `get_advisors` sin avisos nuevos.
8. **Portada y CSS.**
   - **Acciones:**
     - Añadir `.cover-<slug>` en `app/globals.css` (`/frontend-design`).
     - Añadir el CSS del canvas/escalado en `app/globals.css`.
   - **Verificaciones:**
     - Tarjeta visible en `/juegos`.
     - Sin desbordar a 375 px.
9. **Verificación en navegador y documentación.**
   - **Acciones:**
     - Probar con Playwright: guardar score "TEST" y ver el leaderboard.
     - Borrar las filas de prueba de `scores`.
     - Actualizar `CLAUDE.md` y `README.md`.
   - **Verificaciones:**
     - `CLAUDE.md` y `README.md` mencionan la spec.
     - `npm run lint` pasa.
     - `npm run build` pasa.

Cada paso = un commit `NN-<slug>: Paso N`.

## Criterios de aceptación

<Genéricos de checklist.md adaptados + específicos: puntuación por evento, reglas, niveles, condición de derrota, controles.>

## Decisiones

<Sí/No con motivo: port fiel vs rediseño, extras descartados, HUD de plataforma, teclas de pausa, registro genérico, rango de puntuación…>

## Riesgos

<Tabla: StrictMode, teclas pegadas, scroll/foco, dt grande, motor que filtra `isTrusted` (ignoraría el mando táctil), assets (si hay), rango de score, regresión de Asteroids…>

## Qué **no** está en esta spec

<Repetir el "Fuera de alcance".>
````
