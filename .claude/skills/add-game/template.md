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

1. **Lectura previa.**
   - Leer en `node_modules/next/dist/docs/` lo relativo a Client Components y `useEffect`/refs (AGENTS.md).
   - Revisar `components/game-player.tsx` y el CSS de `.crt-screen`.
   - Verificación: sin cambios de código; `git status` limpio.
2. **Contrato común** _(solo si `lib/game-registry.ts` no existe)_.
   - Crear `lib/game-engine.ts` (`GameEngine`, `GameSnapshot` con `score`, `status` y `hud` de pares etiqueta/valor, `GameCallbacks`) y `lib/game-registry.ts` (id → `create`, ancho, alto, `aria`).
   - Crear `components/game-canvas.tsx` genérico y dejar `GamePlayer` sin ramas por id; adaptar Asteroids sin cambiar su comportamiento.
   - Verificación: Asteroids pasa los criterios de SPEC 05.
3. **Constantes, utils y tipos.**
   - Crear `lib/<slug>/constants.ts`, `utils.ts` y `types.ts`.
   - Verificación: `npx tsc --noEmit`.
4. **Entidades** _(si aplica)_.
   - Crear `lib/<slug>/entities.ts`.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
5. **Motor.**
   - Crear `lib/<slug>/engine.ts`: estado, update/draw, input con cleanup, `pause/resume/restart/end/destroy`, snapshot solo ante cambios.
   - Verificación: `npx tsc --noEmit` y `npm run lint`.
6. **Registro del juego.**
   - Registrar el juego en `lib/game-registry.ts`, incluido `touchControls` (solo las direcciones y acciones que usa el juego).
   - Verificación: `/juegos/<slug>/jugar` monta el canvas y, con emulación táctil, aparece el mando.
7. **Migración seed.**
   - Crear `supabase/migrations/NNNN_seed_<slug>.sql` con el `color` de `CATEGORY_COLOR[<CAT>]` (mapa de `checklist.md`), aplicarla con `apply_migration` y regenerar `database.types.ts` si hace falta.
   - Verificación: `list_migrations`, `select id, cat, color from games` (color = el del mapa) y `get_advisors`.
8. **Portada y CSS.**
   - Añadir `.cover-<slug>` y el CSS del canvas/escalado en `app/globals.css` (`/frontend-design`).
   - Verificación: tarjeta visible en `/juegos` y sin desbordar a 375 px.
9. **Verificación en navegador y documentación.**
   - Probar con Playwright (guardar score "TEST", ver leaderboard), borrar las filas de prueba de `scores` y actualizar `CLAUDE.md` y `README.md`.
   - Verificación: ambos mencionan la spec; `npm run lint` y `npm run build` pasan.

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
