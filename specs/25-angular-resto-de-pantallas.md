# SPEC 25 — Angular: resto de pantallas

> **Estado:** Implementado
>
> **Depende de:** SPEC 24 (cimientos y reproductor Angular), SPEC 02 (home), SPEC 03 (about/contacto), SPEC 06 (leaderboard y juegos), SPEC 15 (color por categoría), SPEC 21 (color de categoría en la UI)
> **Fecha:** 2026-11-25
> **Objetivo:** Portar a `angular/` home, biblioteca, detalle de juego, salón de la fama, about (contacto solo UI) y login (solo UI) con el nav completo, mismo DOM y clases CSS que Next y datos leídos a través del BFF Express.

---

## Por qué existe esta spec

Segunda de las seis specs de migración (24-29). La SPEC 24 dejó en `angular/` el reproductor y el BFF (`GET /api/games/:id`). Esta spec añade el resto de pantallas públicas para que Angular tenga paridad visual con Next en todo lo que no depende de sesión. La SPEC 26 conectará auth, guardado de puntuación, contacto (Resend), perfil y borrado de cuenta.

Next sigue siendo la app desplegada hasta la SPEC 28. Se mantiene la **congelación de la UI** de la SPEC 24: cualquier cambio visual en estas pantallas exige paridad en las dos apps o se pospone.

**Criterio de abandono:** el de la SPEC 24 ya se evaluó al cerrarla; si se hubiera revisado la migración, esta spec no se implementaría.

---

## Alcance

**Dentro:**

- **Rutas y modo de render** (mapa de la SPEC 24) en `angular/src/app/app.routes.ts` y `app.routes.server.ts`:

  | Ruta                | Modo               | Título                      |
  | ------------------- | ------------------ | --------------------------- |
  | `/`                 | `Server`           | igual que Next              |
  | `/juegos`           | `Server`           | igual que Next              |
  | `/juegos/:id`       | `Server`           | igual que Next              |
  | `/salon-de-la-fama` | `Server`           | igual que Next              |
  | `/about`            | `Prerender`        | `Acerca de \| Arcade Vault` |
  | `/login`            | `Client`           | igual que Next              |
  | `/juegos/:id/jugar` | `Client` (SPEC 24) | —                           |
  | `**`                | `Server`, 404      | —                           |

  `/perfil`, `/auth/reset-password` y `/auth/callback` **no** se añaden: siguen dando el 404 de Angular hasta la SPEC 26.

- **BFF** (`angular/src/server.ts`): las rutas se extraen a `angular/src/server/api.ts` (`createApiRouter`, recibe la factoría del cliente Supabase para poder probarlo) y `server.ts` solo monta el router. Todas: clave publicable, solo lectura, sin sesión, validación de entrada, 404/500 como en la SPEC 24.
  - `GET /api/games` → `Game[]` ordenados por `sort_order`.
  - `GET /api/games/:id` (SPEC 24, se mueve al router).
  - `GET /api/games/:id/scores?limit=N` → `ScoreRow[]` (score desc, `created_at` asc, rank consecutivo). `N` entero 1-12, defecto 10; fuera de rango o no numérico → 400.
  - `GET /api/scores/recent` → últimas 8 puntuaciones como `RecentScoreView` (`player`, `gameTitle`, `color`, `score`, `ago`). `ago` ("hace 5 min") se calcula en servidor para evitar _hydration mismatch_.
  - `GET /api/scores/top-today` → top 5 de las últimas 24 h (`TopTodayRow`).
- **Cambio mínimo en `lib/`:** nuevo `lib/score-format.ts` (funciones puras `formatScoreDate` y `timeAgo`, movidas desde `lib/scores.server.ts`, que pasa a importarlas). Razón: `scores.server.ts` importa `next/server` y no se puede usar en Express. No se toca nada más de `lib/`; si el `tsconfig` de Angular rompe algo, se relaja en `angular/tsconfig.json`.
- **Servicios:** `GamesService` añade `getGames()` y `getTopScores(id, limit)`; nuevo `ScoresService` con `getRecent()` y `getTopToday()`. Las páginas cargan con `httpResource`; en SSR se espera la respuesta y la _transfer cache_ de `provideClientHydration` evita repetir la petición en el navegador.
- **Nav completo** (`NavComponent`, sustituye la cabecera mínima de `app.html`): logo, enlaces Inicio / Biblioteca / Salón de la Fama / Acerca de con estado activo, contador "CRÉDITOS · 03", botón "Iniciar Sesión" (siempre; sin sesión hasta la SPEC 26), hamburguesa y panel móvil con _backdrop_.
- **Pantallas** con el mismo DOM y clases que Next:
  - **Home:** hero con siluetas flotantes, features, juegos disponibles (6 mini-cards), estadísticas, actividad en vivo (últimas puntuaciones y top de hoy), pricing/FAQ, CTA final; efecto _reveal_ al hacer scroll.
  - **Biblioteca (`/juegos`):** hero, buscador por nombre, chips de categoría (`TODOS` + solo categorías con juegos, orden de `CATEGORIES`), tarjetas.
  - **Detalle (`/juegos/:id`):** ficha (cover, etiquetas, descripción, partidas, mejor global, dificultad), botones "JUGAR AHORA" y "VOLVER AL VAULT", leaderboard top 10. Id inexistente → página "no encontrada" con **estado HTTP 404** real (`RESPONSE_INIT` en SSR). Fallo de lectura del juego → `DataError`; fallo solo del ranking → error dentro del leaderboard, la ficha se mantiene.
  - **Salón de la fama:** pestaña por juego, `?juego=<id>` elige la inicial (desconocido → la primera), podio top 3, tabla top 12, error por pestaña, `ScoreEmpty` si no hay filas. Sin "tu mejor marca" (requiere sesión).
  - **About:** hero y bloque de contacto. El formulario valida con `lib/contact.ts`; un envío válido muestra el aviso "Disponible próximamente" (`role="status"`) y **no** hace ninguna petición.
  - **Login (solo UI):** pestañas iniciar sesión / crear cuenta, validación con `lib/auth-validation.ts`, botones Google/GitHub, "¿Olvidaste tu contraseña?" (`forgot-password`) y "Jugar como invitado" (→ `/juegos`). Envío válido, OAuth y recuperación muestran el aviso "Disponible próximamente". `?error=oauth` y `?confirmed=1` muestran sus avisos como en Next.
- **Estados** como en Next: "CARGANDO…", `DataError`, `ScoreEmpty`.
- **Docs:** `CLAUDE.md` y `README.md` (rutas de Angular, endpoints del BFF, estado de la migración).

**Fuera (specs futuras):**

- `/perfil`, `/auth/reset-password`, `/auth/callback`, sesión/`useAuth`, menú de cuenta y avatar, "tu mejor marca" en el salón, aviso `?cuenta=eliminada`, envío real del contacto (Resend), guardado de puntuación (SPEC 26).
- Despliegue en Vercel y cambio de producción (SPEC 27-28); retirada de Next y tooling (SPEC 29).
- Partir `globals.css` en CSS por componente.
- Tests e2e automatizados.

---

## Modelo de datos

Sin migraciones ni tablas nuevas. Se reutilizan `Game`, `ScoreRow` y `AccentColor` de `lib/`.

```ts
// angular/src/app/shared/models/scores.ts
export interface RecentScoreView {
  player: string;
  gameTitle: string;
  color: AccentColor;
  score: number;
  ago: string; // "hace 5 min", calculado en servidor
}
export interface TopTodayRow {
  player: string;
  score: number;
}

// angular/src/app/shared/services/games.service.ts
getGames(): Observable<Game[]>;
getTopScores(id: string, limit: number): Observable<ScoreRow[]>;

// angular/src/app/shared/services/scores.service.ts
getRecent(): Observable<RecentScoreView[]>;
getTopToday(): Observable<TopTodayRow[]>;
```

```
GET /api/games                          → 200 Game[] | 500
GET /api/games/:id/scores?limit=N       → 200 ScoreRow[] | 400 | 404 | 500
GET /api/scores/recent                  → 200 RecentScoreView[] | 500
GET /api/scores/top-today               → 200 TopTodayRow[] | 500
```

Variables: las de la SPEC 24 (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`); no se añaden.

---

## Diseño de clases

Estructura de la skill `angular:angular-conventions` (una funcionalidad por carpeta, una carpeta por componente, `.html`/`.css` propios). Alias nuevos en `angular/tsconfig.json`: `@home/*`, `@library/*`, `@hall-of-fame/*`, `@about/*`, `@auth/*`.

- **`shared/`**
  - `components/nav` — navegación y panel móvil; estado `open` como signal; sin lógica de datos.
  - `components/leaderboard`, `components/score-empty` — presentacionales (`input()` de filas/enlace).
  - `directives/reveal` — añade `.in` con `IntersectionObserver` solo en navegador; sin observer o con `prefers-reduced-motion`, añade `.in` directamente.
  - `services/games.service`, `services/scores.service` — única vía HTTP a `/api/*`.
  - `utils/format.ts` — `formatScore` (es-ES).
- **`home/`** — `pages/home-page`; `components/{features-section, feature-icon, games-section, mini-card, stats-section, activity-section, pricing-section, final-cta-section, silhouettes}`. Presentacionales salvo `games-section` y `activity-section`, que cargan sus datos con `httpResource`.
- **`library/`** — `pages/{library-page, game-detail-page}`; `components/{game-library, game-card}`. El filtrado de `game-library` es un `computed` sobre `query` y `category`.
- **`hall-of-fame/`** — `pages/hall-of-fame-page` (carga juegos y un ranking por juego en paralelo; lee `?juego` con `withComponentInputBinding`); `components/podium-slot`.
- **`about/`** — `pages/about-page`; `components/{about-hero, highlight-icon, contact-form}`.
- **`auth/`** — `pages/login-page`; `components/{auth-form, forgot-password}`. Sin servicio de sesión.
- **Servidor** — `server/api.ts` (rutas, cliente inyectado) y `server.ts` (arranque, cabeceras, estáticos, handler de Angular).

Cada pieza tiene una sola responsabilidad; las páginas orquestan datos y estados, los componentes pintan.

---

## Plan de implementación

1. **BFF y datos.**
   - **Acciones:**
     - Crear `lib/score-format.ts` con `formatScoreDate` y `timeAgo`; `lib/scores.server.ts` los importa.
     - Crear `angular/src/server/api.ts` con `createApiRouter` y los cinco endpoints; `server.ts` lo monta antes del handler de Angular.
     - Crear `shared/models/scores.ts`; ampliar `GamesService`; crear `ScoresService`.
     - Specs: router (200/400/404/500, `limit` por defecto y límites, orden y rank, `ago`), `GamesService` y `ScoresService` (URL, 404 → `null`, error).
   - **Verificaciones:**
     - `curl :4200/api/games`, `/api/games/snake/scores?limit=5`, `/api/scores/recent` y `/api/scores/top-today` devuelven los mismos datos que muestran `/juegos`, `/juegos/snake`, la home y el salón en Next.
     - `curl -i :4200/api/games/snake/scores?limit=99` → 400; `/api/games/XX!/scores` → 404.
     - `cd angular && ng test --watch=false` y `ng lint` OK; en la raíz `npm run lint && npm run build` OK.

2. **Nav, rutas y piezas compartidas.**
   - **Acciones:**
     - Crear `NavComponent` (con panel móvil), `RevealDirective`, `ScoreEmpty`, `Leaderboard`; sustituir la cabecera de `app.html` por el nav.
     - Declarar las rutas nuevas con `title` y el mapa de `app.routes.server.ts` (páginas mínimas provisionales donde aún no exista la real).
     - Specs: nav (enlace activo por ruta, abrir/cerrar, Esc, foco), `RevealDirective` (con y sin `IntersectionObserver`, reduced-motion), `ScoreEmpty`, `Leaderboard` (filas, vacío, error).
   - **Verificaciones:**
     - En `:4200` el nav marca el enlace activo según la ruta y coincide con `:3000` (screenshot Playwright en `.playwright-screenshots/`).
     - A 390×844 la hamburguesa abre el panel; backdrop y `Esc` lo cierran y el foco vuelve al botón.
     - `/perfil` sigue devolviendo HTTP 404.

3. **Biblioteca y detalle.**
   - **Acciones:**
     - Crear `library-page`, `game-library`, `game-card` y `game-detail-page` (404 con `RESPONSE_INIT`, `DataError`, error de ranking aislado).
     - Specs: filtro por texto y por categoría, chips solo de categorías con juegos, detalle (carga, id inexistente, error del juego, error del ranking).
   - **Verificaciones:**
     - `curl :4200/juegos` y `curl :4200/juegos/snake` contienen títulos y ranking en el HTML (SSR).
     - `curl -i :4200/juegos/xxx` → 404; con `SUPABASE_URL` incorrecta → `DataError`.
     - En el navegador, tras hidratar, no se repiten las llamadas a `/api/games*` (pestaña de red).
     - "JUGAR AHORA" lleva a `/juegos/<id>/jugar`; el color de acento coincide con Next.

4. **Home.**
   - **Acciones:**
     - Crear `home-page` y sus componentes (`silhouettes`, features, `games-section`, stats, `activity-section`, pricing/FAQ, CTA final) usando `RevealDirective`.
     - Specs: `games-section` (6 tarjetas, error), `activity-section` (datos, vacío, error por tarjeta), componentes presentacionales con sus entradas.
   - **Verificaciones:**
     - Screenshot de `/` a escritorio y 390×844 equivalente a Next por sección.
     - `curl :4200/` contiene las mini-cards y las filas de actividad con `ago`.
     - Consola sin errores de hidratación.

5. **Salón de la fama.**
   - **Acciones:**
     - Crear `hall-of-fame-page` y `podium-slot`; pestañas con patrón ARIA _tabs_ (flechas, `Home`/`End`).
     - Specs: pestaña inicial por `?juego`, valor desconocido → primera, cambio de pestaña, podio con menos de 3 filas, error y vacío por pestaña.
   - **Verificaciones:**
     - `/salon-de-la-fama?juego=frogger` abre Frogger; `?juego=xx` abre la primera.
     - Las flechas cambian de pestaña con teclado.
     - El enlace "ver ranking" del menú de fin del reproductor (SPEC 24) llega a la pestaña correcta.

6. **About y login (solo UI).**
   - **Acciones:**
     - Crear `about-page`, `about-hero`, `highlight-icon`, `contact-form`; `login-page`, `auth-form`, `forgot-password`.
     - Specs: validaciones de `lib/contact.ts` y `lib/auth-validation.ts`, aviso "Disponible próximamente", `aria-invalid`/`aria-describedby`, avisos por `?error`/`?confirmed`.
   - **Verificaciones:**
     - `angular/dist/**/browser/about/index.html` existe (prerender).
     - Enviar contacto o login válido muestra el aviso y la pestaña de red no registra ninguna petición.
     - `/login` renderiza en cliente; el botón "INICIA SESIÓN" del reproductor (SPEC 24) ya no da 404.

7. **Paridad, accesibilidad y docs.**
   - **Acciones:**
     - Checklist visual por pantalla (escritorio y 390×844) contra `:3000`; pasada de accesibilidad (teclado, foco, axe).
     - Actualizar `CLAUDE.md` y `README.md`; Estado → Implementado.
   - **Verificaciones:**
     - `cd angular && ng build && ng test --watch=false && ng lint` OK; en la raíz `npm run lint && npm run build` OK.
     - Axe (Playwright) sin violaciones serias/críticas en las seis pantallas.
     - `CLAUDE.md` y `README.md` mencionan SPEC 25 y están sincronizados.

Un commit por paso (`25-angular-resto-de-pantallas: Paso N`); los `.spec.ts` van en el mismo paso que su pieza.

---

## Plan de tests

| Pieza                                          | Casos principales                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Router BFF                                     | 200 con datos; 400 `limit` inválido; 404 id inválido/inexistente; 500 si falla Supabase; orden y rank; `ago` |
| `GamesService`, `ScoresService`                | URL y parámetros; 404 → `null`; propagación de error                                                         |
| `NavComponent`                                 | enlace activo; abrir/cerrar; `Esc`; foco                                                                     |
| `RevealDirective`                              | añade `in` al intersectar; sin observer; reduced-motion                                                      |
| `game-library`                                 | filtro por texto, por categoría, combinado; sin resultados; chips                                            |
| `game-detail-page`                             | carga, 404, `DataError`, ranking fallido aislado                                                             |
| `hall-of-fame-page`                            | pestaña inicial, desconocida, cambio, teclado, podio incompleto, error/vacío por pestaña                     |
| `activity-section`                             | datos, vacío, error por tarjeta                                                                              |
| `contact-form`, `auth-form`, `forgot-password` | validaciones, aviso, sin petición HTTP                                                                       |

La lógica ya compartida de `lib/` (validadores, `toGame`, `formatPlays`, `timeAgo`) no se re-testea.

---

## Criterios de aceptación

- [x] `/`, `/juegos`, `/juegos/:id`, `/salon-de-la-fama` se renderizan en servidor; `/about` se prerenderiza; `/login` y `/juegos/:id/jugar` en cliente.
- [x] Los cinco endpoints del BFF devuelven los códigos y datos descritos; el navegador solo llama a `/api/*`.
- [x] `/juegos/xxx` y cualquier ruta desconocida devuelven HTTP 404 con la página "no encontrada"; `/perfil` sigue en 404.
- [x] El HTML servido de home, biblioteca, detalle y salón contiene los datos (SSR); tras hidratar no se repiten las peticiones ni hay errores de hidratación.
- [x] Biblioteca: búsqueda y chips de categoría filtran como en Next.
- [x] Detalle: un fallo del ranking no tumba la ficha; un fallo de lectura del juego muestra `DataError`.
- [x] Salón: `?juego=<id>` elige la pestaña; desconocido → la primera; error y vacío por pestaña.
- [x] Contacto y login validan igual que Next y muestran "Disponible próximamente" sin ninguna petición de red.
- [x] Aspecto equivalente a Next en las seis pantallas, escritorio y 390×844.
- [x] El único cambio en `lib/` es `lib/score-format.ts` y su uso en `lib/scores.server.ts`; la app Next compila y pasa lint.
- [x] **Accesibilidad (WCAG 2.2 AA):**
  - [x] Nav: hamburguesa con `aria-expanded`/`aria-controls`, foco al abrir el panel y retorno al cerrar, `Esc` cierra.
  - [x] Pestañas del salón con roles `tablist`/`tab`/`tabpanel`, flechas y `Home`/`End`.
  - [x] Chips de categoría con `aria-pressed`; buscador con etiqueta accesible.
  - [x] Formularios con `<label>`, `aria-invalid` y `aria-describedby`; avisos con `role="status"` (errores con `role="alert"`).
  - [x] Elementos decorativos (siluetas, flecha de scroll) con `aria-hidden`.
  - [x] `Reveal` respeta `prefers-reduced-motion`.
  - [x] Objetivos táctiles ≥24×24 px y foco visible.
  - [ ] axe sin violaciones serias: **pendiente solo el contraste de color** (`--ink-faint`, filas fantasma de `ScoreEmpty`, `.tk-mid`), que vive en `app/globals.css` y es idéntico en Next; diferido a una spec de diseño por decisión del usuario (ver Decisiones). Sin contraste, axe sale limpio en las seis pantallas (WCAG 2.2 AA y buenas prácticas; único aviso moderado: falta `h1` en detalle y login).
- [x] Cada pieza nueva tiene su `.spec.ts`.
- [x] `cd angular && ng build && ng test --watch=false && ng lint` pasa; en la raíz `npm run lint && npm run build` siguen OK.
- [x] `CLAUDE.md` y `README.md` actualizados.

---

## Decisiones

- **Sí:** un endpoint por recurso en el BFF, como en la SPEC 24. Razón: patrón único y fácil de probar; el navegador sigue sin hablar con Supabase.
- **Sí:** `ago` calculado en servidor. Razón: evita _hydration mismatch_, igual que Next.
- **Sí:** el salón pide `/api/games` y un ranking por juego en paralelo, sin endpoint agregado. Razón: reutiliza endpoints; con 5 juegos el coste es bajo. Se reevalúa si el catálogo crece.
- **Sí:** `/perfil` queda fuera hasta la SPEC 26. Razón: sin sesión solo mostraría datos falsos o una redirección artificial.
- **Sí:** login y contacto como solo UI con aviso "Disponible próximamente". Razón: permite comparar aspecto y validación sin adelantar auth ni Resend.
- **Sí:** 404 HTTP real en el detalle con `RESPONSE_INIT`. Razón: la ruta tiene SEO (a diferencia de `/jugar`).
- **Sí:** patrón ARIA _tabs_ en el salón. Razón: mejora de accesibilidad sin cambiar el aspecto; Next usaba botones simples.
- **Sí:** `lib/score-format.ts` como único cambio en `lib/`. Razón: `scores.server.ts` depende de `next/server`.
- **No:** endpoint de contacto, sesión ni guardado de puntuación. Razón: SPEC 26.
- **No:** CSS por componente. Razón: se mantiene `globals.css` compartido.
- **Diferido (paso 7):** el contraste de color de `globals.css` (`--ink-faint` 2.39:1, filas fantasma 1.33/1.68, `.tk-mid` 4.36 frente al mínimo de 4.5) no se corrige aquí. Razón: el CSS es compartido con Next (congelación de UI y paridad) y el riesgo ya preveía documentarlo; se aborda en una spec de diseño. El detalle y el login siguen con `h2` (sin `h1`) por la misma razón.
- **Desviaciones de implementación:** las páginas cargan con `rxResource` sobre los servicios (no `httpResource`), igual que `play-page`; se añadió `shared/components/loading` y `:host { display: block }` en `leaderboard`, `score-empty` y `data-error`; `/about` muestra también el mensaje de error de validación (Next solo hacía temblar el formulario); `tsconfig.json` de Angular relaja `noPropertyAccessFromIndexSignature` (importaba `lib/scores.ts`, que usa `process.env.X`).

---

## Riesgos

| Riesgo                                                                    | Mitigación                                                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `HttpClient` con URLs relativas falla en SSR                              | Comprobar con ctx7 en el paso 1; alternativa: base URL desde `REQUEST`                        |
| _Hydration mismatch_ por fechas o `toLocaleString`                        | `ago` y fechas formateados en servidor; `formatScore` fijo a `es-ES`                          |
| La _transfer cache_ no evita las peticiones duplicadas con `httpResource` | Verificar en la pestaña de red (paso 3); alternativa: `TransferState` manual                  |
| `RESPONSE_INIT`/estado 404 distinto según versión de Angular              | Consultar ctx7 antes del paso 3                                                               |
| Prerender de `/about` intenta leer datos o `window`                       | La página no usa datos; `RevealDirective` protegido para SSR                                  |
| El runner del CLI no ejecuta bien los tests del router Express            | Probar handlers puros con cliente simulado; si no, `supertest` como devDependency documentada |
| Contraste AA insuficiente en `globals.css`                                | Mantener paridad con Next; documentar fallos para una spec futura de diseño                   |
| Spec demasiado grande (7 pasos, 6 pantallas)                              | Si se alarga, mover login a la SPEC 26                                                        |
| Doble mantenimiento de la UI durante 24-29                                | Congelación de UI de la SPEC 24 sigue vigente                                                 |

---

## Qué **no** entra en esta spec

- Perfil, reset de contraseña, callback OAuth, sesión, menú de cuenta y avatar (SPEC 26).
- Envío real del contacto con Resend y guardado de puntuaciones (SPEC 26).
- Despliegue, cambio de producción y retirada de Next (SPEC 27-29).
- CSS por componente y tests e2e.

Cada uno, si llega, va en su propia spec.
