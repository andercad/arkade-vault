# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Estado:** Implementado
> **Depende de:** ninguna (el CSS del tema ya está en `app/globals.css` y las fuentes en `app/layout.tsx`)
> **Fecha:** 2026-11-10
> **Objetivo:** Portar a Next.js (App Router, TypeScript) las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor, salón de la fama, login/registro) con datos mock y sin ningún juego real.

---

## Por qué existe esta spec

`references/templates/` es un prototipo en React + Babel con una sola página y ruta en `location.hash`. Hay que convertirlo en una app Next.js real, con rutas, componentes tipados y "use client" solo donde hace falta, manteniendo el aspecto y el copy del prototipo 1:1.

---

## Alcance

**Dentro:**

- 5 pantallas con rutas reales del App Router:
  - `/` → Biblioteca (hero, búsqueda, chips de categoría, grid de tarjetas con tilt).
  - `/juegos/[id]` → Detalle (portada, tags, stats, leaderboard top 10).
  - `/juegos/[id]/jugar` → Reproductor (HUD, CRT, pausa, fin de juego, modal de guardar puntuación).
  - `/salon-de-la-fama` → Salón de la Fama (tabs por juego, podio, tabla top 12, fila "tu mejor marca").
  - `/login` → Login / crear cuenta (tabs, invitado, botones sociales sin acción).
- Layout global: `Nav` (links, contador "CRÉDITOS · 03" fijo, botón sesión, menú móvil con backdrop) y footer "© 2026 ARCADE VAULT · … · v2.6.0".
- Sesión mock: usuario en `localStorage` clave `av_user`, expuesto por un `AuthProvider` (Context cliente).
- Puntuaciones guardadas en `localStorage` clave `av_scores` (solo escritura, igual que el template).
- Datos mock tipados en TS: 8 juegos, 5 categorías, `seededScores` determinista.
- Reproductor con simulación: la puntuación sube sola con un timer aleatorio; arena decorativa (grid, enemigos, nave).
- Rutas inexistentes (`/juegos/xxx`) devuelven 404 con `notFound()`.
- Responsive según los breakpoints ya definidos en `globals.css`.

**Fuera de alcance (specs futuras):**

- Cualquier juego real jugable (canvas, lógica, controles).
- Auth real: backend, hashing, validación, OAuth. Google/GitHub son botones sin acción.
- Base de datos, API, route handlers.
- Leer `av_scores` para mostrar rankings reales; "tu mejor marca" sigue simulada.
- Menú de usuario desplegable (clic en el nombre = cerrar sesión, como el template).
- Créditos dinámicos.
- Tests automatizados (no hay runner configurado).
- Internacionalización (solo español).

---

## Modelo de datos

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: AccentColor;
  best: number;
  plays: string;       // "12.4K"
}

export const GAMES: Game[];                       // 8 juegos, copiados de data.jsx
export const CATS: ("TODOS" | Category)[];

// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "dd/mm/2026"
}
export function seededScores(seed: number, count?: number): ScoreRow[];

// lib/auth.tsx (cliente)
export interface User { name: string }             // MAYÚSCULAS, máx. 10 caracteres
// AuthProvider expone: { user: User | null, login(u: User | null), signOut() }

// Persistencia (localStorage)
// "av_user"   → JSON User | ausente
// "av_scores" → JSON Array<{ game: string; score: number; name: string; at: number }>
```

Convenciones:

- Números con `toLocaleString("es-ES")`.
- Semillas de `seededScores` idénticas al template: detalle `id.length * 17 + 3` (10 filas), salón `id.length * 23 + 7` (12 filas).
- Lecturas de `localStorage` solo en efectos/handlers del cliente, con `try/catch`.

---

## Plan de implementación

1. Crear `lib/games.ts` y `lib/scores.ts` con los tipos y los datos mock portados de `data.jsx`. Verificación: `npx tsc --noEmit` pasa.
2. Crear `lib/auth.tsx` con `AuthProvider` (lee `av_user` tras montar, `login`, `signOut`). Montarlo en `app/layout.tsx`.
3. Crear `components/nav.tsx` (cliente, menú móvil incluido) y el footer en `app/layout.tsx`. Verificación: nav visible en todas las rutas, hamburguesa abre el panel.
4. Reemplazar `app/page.tsx` por la Biblioteca: `components/game-card.tsx` (tilt) y `components/library.tsx` (búsqueda + chips + estado vacío). Verificación: filtrar por texto y categoría funciona.
5. Crear `app/juegos/[id]/page.tsx` con `components/leaderboard.tsx`; usar `notFound()` si el id no existe. Verificación: clic en tarjeta lleva al detalle.
6. Crear `app/login/page.tsx` con `components/auth-form.tsx` (tabs, submit, invitado). Verificación: entrar muestra el nombre en la nav y persiste al recargar.
7. Crear `app/salon-de-la-fama/page.tsx` con `components/hall-of-fame.tsx` (tabs, podio, tabla, fila "tu mejor marca" solo con sesión).
8. Crear `app/juegos/[id]/jugar/page.tsx` con `components/game-player.tsx` (HUD, CRT, pausa, timer, modal de fin de juego, guardado en `av_scores`).
9. Retirar el contenido scaffold restante (`next.svg`, `vercel.svg` si no se usan) y ajustar `metadata` si hace falta. Verificación: `npm run lint` y `npm run build` pasan.

Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` (en especial `params` asíncronos y `notFound`), según `AGENTS.md`.

---

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] Las 5 rutas (`/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/salon-de-la-fama`, `/login`) cargan sin errores en la consola del navegador.
- [x] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran 404.
- [x] La biblioteca muestra 8 tarjetas; el chip "SHOOTER" deja 2 (INVASORES, ROCAS).
- [x] Buscar "zzz" muestra "NO HAY RESULTADOS".
- [x] Clic en tarjeta o en "JUGAR" lleva a `/juegos/[id]` del juego correcto.
- [x] El detalle muestra 10 filas de leaderboard; las 3 primeras con clases `top1`/`top2`/`top3`.
- [x] "JUGAR AHORA" lleva a `/juegos/[id]/jugar`; "VOLVER AL VAULT" lleva a `/`.
- [x] En el reproductor la puntuación sube sola; "PAUSA" la detiene y muestra "EN PAUSA"; "REANUDAR" la reanuda.
- [x] "FIN" abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" añade una entrada a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [x] "JUGAR DE NUEVO" reinicia puntuación, vidas y nivel; "SALIR" vuelve al detalle.
- [x] El salón muestra podio (02 · 01 · 03), 12 filas y cambia los datos al cambiar de tab.
- [x] La fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [x] En `/login`, la pestaña "CREAR CUENTA" añade el campo de correo; enviar guarda `av_user` en mayúsculas (máx. 10 caracteres) y redirige a `/`.
- [x] "JUGAR COMO INVITADO" redirige a `/` sin `av_user`.
- [x] Tras iniciar sesión y recargar, la nav sigue mostrando el nombre; clic en él cierra sesión y borra `av_user`.
- [x] En ancho ≤ el breakpoint móvil de `globals.css`, la hamburguesa abre y cierra el panel lateral.
- [x] La nav marca "Biblioteca" activa en `/`, `/juegos/*` y `/juegos/*/jugar`, y "Salón de la Fama" activa en `/salon-de-la-fama`.
- [x] No hay hydration warnings al recargar con sesión guardada.

---

## Decisiones

- **Sí:** rutas App Router reales. URLs compartibles, back/forward nativo, idiomático en Next.
- **No:** SPA con hash JSON como el template. Se pierde SSR y routing de Next.
- **Sí:** sesión mock en `localStorage` (`av_user`) con `AuthProvider`. Fiel al template y suficiente para ver estados con/sin sesión.
- **No:** auth real. Es un dominio entero (backend, seguridad) que merece su propia spec.
- **Sí:** simulación de puntuación en el reproductor. Permite ver HUD, pausa y fin de juego sin juego real.
- **Sí:** datos mock en `lib/` con tipos. Sin API, mismas semillas que el template.
- **No:** route handlers `/api`. Complejidad sin valor mientras no haya backend.
- **Sí:** `components/` y `lib/` en la raíz (sin `src/`), coherente con el alias `@/*`.
- **Sí:** fidelidad 1:1 (copy, animaciones, créditos fijos, "tu mejor marca" simulada, clic en nombre = cerrar sesión).
- **No:** menú de usuario desplegable ni leer `av_scores` para rankings. Mejoras para una spec posterior.
- **Sí:** páginas como Server Components; `"use client"` solo en nav, biblioteca, tarjeta, auth, salón y reproductor.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Next 16 tiene cambios incompatibles (p. ej. `params` asíncronos) | Leer `node_modules/next/dist/docs/` antes de codificar, como exige `AGENTS.md`. |
| Hydration mismatch al leer `av_user` | Leer `localStorage` en `useEffect` tras montar; render inicial como invitado. |
| `Math.random` del timer del reproductor rompe SSR/hydration | Iniciar timer solo en `useEffect`; score inicial 0 determinista. |
| `localStorage` no disponible (modo privado) | `try/catch` en toda lectura/escritura; la app sigue funcionando sin persistir. |
| Clases CSS del template ausentes en `globals.css` | Verificar visualmente cada pantalla; si falta alguna, portarla desde `references/templates/styles.css`. |
| `layout.tsx` envuelve children en `<div id="root">` con `height: 100%` | Comprobar que el scroll y el footer se comportan como en el template. |

---

## Qué **no** está en esta spec

- Ningún juego real (Bloque Buster, Caída, etc.).
- Autenticación real, OAuth, backend o base de datos.
- Rankings leídos de las puntuaciones guardadas.
- Menú de usuario desplegable y créditos dinámicos.
- Tests automatizados, i18n, PWA.

Cada uno, si llega, va en su propia spec.
