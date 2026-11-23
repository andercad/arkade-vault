# SPEC 18 — Solo los jugadores con sesión guardan puntuación

> **Estado:** Implementado
>
> **Depende de:** SPEC 06 (leaderboard y juegos), SPEC 16 (autenticación), SPEC 17 (medidas de seguridad)
> **Fecha:** 2026-11-23
> **Objetivo:** Que solo los jugadores con sesión guarden puntuaciones en `scores` y aparezcan en los rankings; el invitado puede jugar pero no guardar.

---

## Por qué existe esta spec

- Hoy el invitado guarda con nombre libre (`player_name` editable, `user_id` null): cualquiera puede suplantar iniciales en el ranking.
- SPEC 16 dejó `scores.user_id` nullable y `on delete set null`; SPEC 17 permitió `user_id is null` en la policy de insert.
- La FAQ de la home (`lib/home.ts`) ya dice "si quieres guardar tu puntuación y aparecer en el ranking, regístrate": la app debe cumplirlo.

## Alcance

**Dentro:**

- Migración `0013_scores_solo_usuarios.sql`: borrar puntuaciones con `user_id is null`; `user_id not null`; FK `on delete cascade`; policy de insert solo `authenticated` con `user_id = auth.uid()`.
- Regenerar `lib/supabase/database.types.ts` (`user_id: string` en Row).
- `components/game-player.tsx`:
  - Con sesión: sin input de nombre; `player_name` = `user.name` (username); botón GUARDAR PUNTUACIÓN.
  - Invitado: modal de fin con puntuación final, texto "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" y botón INICIAR SESIÓN → `/login`; la puntuación de esa partida se pierde.
  - Mientras `useAuth().loading`: ni input ni aviso (sin parpadeo); botón de guardar oculto.
  - HUD "Jugador": username con sesión, "INVITADO" sin sesión.
  - Eliminar `av_player_name` (localStorage, `useSyncExternalStore`, `typedName`) por quedar sin uso.
- `lib/scores.ts`: `submitScore` sin cambios de firma (la BD pone `user_id` por `default auth.uid()`); actualizar comentario.
- Docs: `CLAUDE.md` + `README.md` (SPEC 18, migración 0013, invitado no guarda, cascade), `references/security/security-checklist.md`, `.claude/agents/security-auditor.md` (checks de insert de `scores`: ya no `user_id is null`), `references/deploy/prod-runbook.md` (pegar 0013 a mano en prod; no añadir a `prod-setup.sql`, que consolida 0001-0012).

**Fuera (specs futuras):**

- Guardar la puntuación pendiente del invitado y enviarla tras iniciar sesión.
- `?next=` para volver al juego tras el login.
- Trigger/check en BD que fuerce `player_name` = `profiles.username` (hoy el cliente lo envía; un cliente manipulado con sesión podría poner otro nombre, pero ligado a su `user_id`).
- Mostrar el ranking por username vivo (join con `profiles`) en vez de `player_name`.
- Anti-trampas de puntuación (validación en servidor).
- Quitar "JUGAR COMO INVITADO" de `/login` (el invitado sigue pudiendo jugar).
- Eliminar cuenta desde `/perfil` (SPEC 19, futura): aprovechará el `on delete cascade` de esta spec para borrar sus puntuaciones.

---

## Modelo de datos

```sql
-- 0013_scores_solo_usuarios.sql
-- 1) Puntuaciones de invitado fuera (irreversible).
delete from public.scores where user_id is null;

-- 2) Toda puntuación pertenece a un usuario; si se borra, se borran sus puntuaciones.
alter table public.scores alter column user_id set not null;
alter table public.scores drop constraint scores_user_id_fkey;
alter table public.scores
  add constraint scores_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- 3) Insert solo con sesión y con el propio user_id.
drop policy "scores insert anónimo" on public.scores;
create policy "scores insert usuario" on public.scores
  for insert to authenticated
  with check (
    exists (select 1 from public.games g where g.id = game_id)
    and user_id = (select auth.uid())
  );
```

Nombre real de la FK: comprobar en el paso 1 (`pg_constraint`) antes de aplicar; `scores_user_id_fkey` es el esperado. `default auth.uid()` se mantiene. Lectura (`select`) de `scores` sigue pública. Sin tablas nuevas.

---

## Plan de implementación

1. **Migración BD.**
   - Consultar nombre de la FK y nº de filas con `user_id is null` (informativo); escribir `supabase/migrations/0013_scores_solo_usuarios.sql`; `apply_migration`; regenerar `lib/supabase/database.types.ts`.
   - Verificación: `list_migrations` incluye 0013; `select count(*) from scores where user_id is null` = 0; `information_schema.columns` → `user_id` `is_nullable = NO`; `pg_constraint` → `confdeltype = 'c'`; `pg_policies` → solo `scores insert usuario` para `authenticated`; en `begin…rollback`: insert como `anon` → falla RLS; como `authenticated` con su `auth.uid()` → OK; con `user_id` ajeno → falla; borrar un usuario de prueba → sus scores desaparecen; `get_advisors` security sin avisos nuevos; `tsc` limpio.
2. **Reproductor: guardar solo con sesión.**
   - `components/game-player.tsx` según Alcance (usar `useAuth()` de `lib/auth.tsx`; reutilizar clases `.btn`, `.toast-saved`, `.modal` existentes); comentario de `lib/scores.ts`.
   - Verificación: `tsc`/`lint` limpios; Playwright (o manual si el MCP no conecta) en `/juegos/snake/jugar`: invitado → FIN → modal con aviso y botón INICIAR SESIÓN que lleva a `/login`, sin input ni botón de guardar, ninguna fila nueva en `scores`; con sesión → FIN → sin input, GUARDAR PUNTUACIÓN → "PUNTUACIÓN GUARDADA", fila con `player_name` = username y `user_id` del usuario, visible en `/juegos/snake` y `/salon-de-la-fama?juego=snake`; HUD muestra username / "INVITADO"; recargar con sesión no muestra el aviso de invitado (sin parpadeo); `localStorage` sin `av_player_name` escrito.
3. **Docs y cierre.**
   - `CLAUDE.md`, `README.md`, `security-checklist.md`, `.claude/agents/security-auditor.md`, `prod-runbook.md` según Alcance; Estado → Implementado.
   - Verificación: `npm run build` OK; grep de `user_id is null` solo queda en migraciones/specs históricas; todos los criterios marcados.

Un commit por paso (`18-solo-logueados-puntuan: Paso N`). Al final, proponer `security-auditor` (toca migración/policies).

---

## Criterios de aceptación

- [x] `scores` no contiene filas con `user_id` null y la columna es `not null`.
- [x] Insertar en `scores` como `anon` falla; como `authenticated` solo funciona con su propio `user_id`.
- [x] Borrar un usuario de `auth.users` borra sus puntuaciones (cascade).
- [x] El invitado puede jugar; al terminar ve "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN" y un botón a `/login`, sin input ni botón de guardar.
- [x] Con sesión, el modal no tiene input de nombre; la puntuación se guarda con `player_name` = username.
- [x] La puntuación guardada aparece en el leaderboard del detalle, en el salón de la fama y en la actividad de la home.
- [x] Sin parpadeo invitado→usuario en el modal mientras carga la sesión.
- [x] `av_player_name` ya no se usa en el código.
- [x] `get_advisors` security sin avisos nuevos.
- [x] `tsc`, `lint` y `build` limpios; `CLAUDE.md`, `README.md`, checklist, `security-auditor.md` y runbook actualizados.

---

## Decisiones

- **Sí:** borrar las puntuaciones de invitado existentes. Razón: decisión del usuario; ranking, home y `game_stats` quedan coherentes sin filtrar consultas.
- **No:** conservar y filtrar `user_id is not null` en lecturas. Razón: más cambios en consultas y vista para datos que ya no cuentan.
- **Sí:** reforzar en RLS además de en UI. Razón: ocultar el botón no impide un insert directo con la clave pública.
- **Sí:** `user_id not null` + FK `on delete cascade`. Razón: la regla "solo usuarios en el ranking" se mantiene también al borrar cuentas; sustituye el `set null` de SPEC 16.
- **Sí:** nombre fijo = username, sin input. Razón: el nombre identifica al jugador; quita el localStorage de invitado.
- **No:** forzar `player_name` en BD con trigger. Razón: fuera de lo pedido; la fila ya queda ligada al `user_id`.
- **No:** guardar puntuación pendiente del invitado ni `?next=`. Razón: decisión del usuario; más complejidad y superficie de trampa/open redirect.
- **Sí:** mantener "JUGAR COMO INVITADO". Razón: el invitado sigue jugando, solo no puntúa.
- **No:** añadir 0013 a `prod-setup.sql`. Razón: el runbook ya indica pegar migraciones nuevas a mano.
- **No:** eliminar cuenta en esta spec. Razón: otra área (Server Action con `service_role`, confirmación); va en SPEC 19.

---

## Riesgos

| Riesgo                                                        | Mitigación                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Borrado irreversible de puntuaciones de invitado (dev y prod) | Decisión aceptada; contar filas antes en el paso 1; en prod, exportar si se quiere conservar antes de pegar 0013 |
| La FK tiene otro nombre y el `drop constraint` falla          | Consultar `pg_constraint` antes de escribir la migración                                                         |
| Sesión caducada en mitad de la partida → insert rechazado     | Se muestra "NO SE PUDO GUARDAR · REINTENTA" (ya existe); `proxy.ts` refresca la sesión                           |
| Parpadeo del aviso de invitado mientras carga `useAuth`       | Ocultar aviso y guardado con `loading`                                                                           |
| Otros puntos que insertan en `scores` como anon               | Solo `submitScore` inserta (grep); verificación del paso 1                                                       |
| Prod sin 0013 tras desplegar la UI                            | Runbook: pegar 0013 en prod antes o junto al despliegue                                                          |

---

## Qué **no** entra en esta spec

- Puntuación pendiente tras login, `?next=`.
- `player_name` forzado en BD o ranking por username vivo.
- Anti-trampas de puntuación.
- Eliminar cuenta desde `/perfil` → SPEC 19.

Cada uno, si llega, va en su propia spec.
