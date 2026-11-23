# SPEC 19 — Cambiar contraseña y eliminar cuenta desde el perfil

> **Estado:** Aprobado
>
> **Depende de:** SPEC 16 (autenticación), SPEC 17 (medidas de seguridad), SPEC 18 (solo logueados puntúan)
> **Fecha:** 2026-11-23
> **Objetivo:** Que el jugador con sesión pueda, desde `/perfil`, cambiar su contraseña (si su cuenta tiene identidad email) y eliminar su cuenta con sus puntuaciones.

---

## Por qué existe esta spec

- SPEC 16 dejó fuera cambiar contraseña y borrar cuenta desde la UI ("el borrado se hace desde Supabase").
- SPEC 18 dejó `scores.user_id` con `on delete cascade` pensando en esta spec; `profiles.id` ya tiene `on delete cascade` (0010).
- Hoy el único cambio de contraseña es "¿Olvidaste tu contraseña?" (email); un jugador logueado no puede cambiarla ni darse de baja.

## Alcance

**Dentro:**

- `lib/auth.tsx`: `User.hasPassword: boolean` (`app_metadata.providers` incluye `"email"`).
- `app/perfil/actions.ts` (nuevo, `"use server"`):
  - `changePassword(formData)`: usuario de la sesión (`createClient().auth.getUser()`); exige `hasPassword`; valida actual no vacía, nueva con `validatePassword`, repetir = nueva, nueva ≠ actual; verifica la actual con `createAuthActionClient().auth.signInWithPassword` (rate limit por IP, SPEC 17); con ese mismo cliente `auth.updateUser({ password })` y `auth.signOut({ scope: "others" })`.
  - `deleteAccount(formData)`: usuario de la sesión; compara `confirm` (mayúsculas, trim) con su `profiles.username` (leído con `createClient`); `createAdminClient().auth.admin.deleteUser(user.id)` (cascade borra `profiles` y `scores`); limpia cookies con `signOut({ scope: "local" })`.
  - Ambas devuelven `AuthResult`; nunca reciben `user_id` del cliente.
- `components/profile-form.tsx`:
  - Botón "CAMBIAR CONTRASEÑA" (solo si `hasPassword`) que despliega formulario: contraseña actual, nueva, repetir; `.terminal-error` / `.terminal-notice` "Contraseña actualizada."; al éxito se vacía y se pliega.
  - Orden: usuario → cambiar contraseña → SALIR / CERRAR SESIÓN → "Zona peligrosa" con botón ELIMINAR CUENTA (rojo).
  - Modal de eliminar: aviso (irreversible, borra perfil y puntuaciones), input "Escribe tu usuario para confirmar", botón ELIMINAR habilitado solo si coincide con `user.name`; CANCELAR y `Esc` cierran. Éxito → `signOut()` de `useAuth` + `router.push("/?cuenta=eliminada")`.
- Home: aviso "Cuenta eliminada" con `?cuenta=eliminada` (componente cliente con `useSearchParams` dentro de `Suspense`, compatible con `cacheComponents`).
- `lib/supabase/admin.ts`: comentario (usos: `email_for_username` y `deleteUser`).
- Docs: `CLAUDE.md` + `README.md` (SPEC 19, `/perfil`, admin), `references/security/security-checklist.md` (re-auth en cambio de contraseña, `deleteUser` solo servidor con usuario de la sesión), `.claude/agents/security-auditor.md` (checks equivalentes).
- Sin migración: los cascades ya existen (0010, 0013).

**Fuera (specs futuras):**

- Cambiar email.
- Añadir contraseña a una cuenta solo OAuth, vincular/desvincular proveedores.
- Borrado diferido / periodo de gracia / recuperar cuenta; exportar datos antes de borrar.
- Email de aviso tras cambiar contraseña o borrar cuenta.
- Re-autenticación OAuth para borrar (cuentas Google/GitHub confirman solo con el username).
- Cerrar sesiones de otros dispositivos al borrar (el usuario deja de existir; sus refresh tokens se invalidan).

---

## Modelo de datos

Sin tablas, columnas ni migraciones nuevas.

```ts
// lib/auth.tsx
export interface User {
  id: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean; // app_metadata.providers incluye "email"
}
```

`FormData`: `changePassword` → `current`, `password`, `repeat`; `deleteAccount` → `confirm`.

Mensajes:

| Caso                                      | Mensaje                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| Actual incorrecta (`invalid_credentials`) | "La contraseña actual no es correcta."                        |
| Nueva débil                               | `PASSWORD_ERROR`                                              |
| No coinciden                              | "Las contraseñas no coinciden."                               |
| Igual a la actual (`same_password`)       | "La nueva contraseña debe ser distinta de la anterior."       |
| `over_request_rate_limit`                 | "Demasiados intentos. Espera unos minutos y vuelve a probar." |
| Username de confirmación no coincide      | "El usuario no coincide."                                     |
| Sin sesión                                | "Inicia sesión para continuar."                               |
| Otro error                                | "No se pudo completar la operación. Inténtalo de nuevo."      |

---

## Plan de implementación

1. **Cambiar contraseña.**
   - `hasPassword` en `lib/auth.tsx`; `changePassword` en `app/perfil/actions.ts` (reutilizar `validatePassword`/`PASSWORD_ERROR` de `lib/auth-validation.ts`, `createAuthActionClient` de `lib/supabase/server.ts`, mapeo de errores como `app/login/actions.ts`); desplegable en `components/profile-form.tsx` (`/frontend-design`, clases `.field`, `.btn`, `.terminal-error`, `.terminal-notice`).
   - Verificación: `tsc`/`lint` limpios; Playwright en `/perfil` con cuenta email: actual mala → "La contraseña actual no es correcta."; débil → `PASSWORD_ERROR`; repetir distinta → "no coinciden"; igual a la actual → mensaje; correcta → "Contraseña actualizada.", sigue con sesión; cerrar sesión y entrar con la nueva → OK, con la antigua → falla; con cuenta solo OAuth (o simulando `providers` sin `email`) el botón no aparece; llamar a la acción sin sesión → "Inicia sesión para continuar.".
2. **Eliminar cuenta.**
   - `deleteAccount` en `app/perfil/actions.ts`; zona peligrosa + modal en `components/profile-form.tsx`; aviso en la home con `?cuenta=eliminada`; comentario de `lib/supabase/admin.ts`.
   - Verificación: crear usuario de prueba en dev con alguna puntuación; Playwright: modal con ELIMINAR deshabilitado hasta escribir el username exacto (minúsculas también valen); CANCELAR/`Esc` cierran sin borrar; confirmar → home con "Cuenta eliminada", nav sin sesión; `execute_sql` (`SELECT`): 0 filas en `auth.users`, `profiles` y `scores` para ese id; volver a `/perfil` → `/login`; entrar con sus credenciales → falla; `confirm` manipulado en la acción → "El usuario no coincide." y nada borrado.
3. **Docs y cierre.**
   - `CLAUDE.md`, `README.md`, `security-checklist.md`, `security-auditor.md` según Alcance; Estado → Implementado.
   - Verificación: `npm run build` OK; grep de `SUPABASE_SECRET_KEY`/`createAdminClient` solo en archivos `server-only`/Server Actions; todos los criterios marcados.

Un commit por paso (`19-perfil-contrasena-y-borrar-cuenta: Paso N`). Al final, proponer `security-auditor` (toca auth y `service_role`).

---

## Criterios de aceptación

- [ ] Con cuenta email, `/perfil` muestra "CAMBIAR CONTRASEÑA"; con cuenta solo OAuth, no.
- [ ] El cambio exige la contraseña actual correcta, nueva con la regla de SPEC 17 y repetir igual; cada fallo muestra su mensaje.
- [ ] Tras cambiarla, la nueva sirve para entrar y la antigua no; la sesión actual sigue abierta y las de otros dispositivos se cierran.
- [ ] Intentos con contraseña actual errónea cuentan en el rate limit de Auth (mensaje "Demasiados intentos…").
- [ ] ELIMINAR CUENTA abre un modal; el botón de confirmar solo se habilita al escribir el username; CANCELAR/`Esc` no borra nada.
- [ ] Al confirmar, desaparecen el usuario de `auth.users`, su fila de `profiles` y todas sus `scores`; queda sin sesión en la home con aviso "Cuenta eliminada".
- [ ] Las Server Actions toman el usuario de la sesión, no del cliente; sin sesión devuelven error.
- [ ] `SUPABASE_SECRET_KEY` no aparece en el bundle cliente.
- [ ] `tsc`, `lint` y `build` limpios; `CLAUDE.md`, `README.md`, checklist y `security-auditor.md` actualizados.

---

## Decisiones

- **Sí:** confirmar el borrado escribiendo el username. Razón: un único flujo para cuentas email y OAuth; evita borrados por error.
- **No:** pedir contraseña para borrar. Razón: dejaría fuera a las cuentas OAuth o exigiría dos flujos.
- **Sí:** pedir la contraseña actual para cambiarla, verificada en servidor. Razón: un navegador con sesión abierta no basta para cambiarla; aprovecha el rate limit por IP de SPEC 17.
- **Sí:** mostrar el cambio si la cuenta tiene identidad `email` (aunque tenga OAuth vinculado). Razón: esa cuenta tiene contraseña real.
- **Sí:** cerrar las demás sesiones tras cambiar la contraseña. Razón: si la contraseña estaba comprometida, expulsa al intruso.
- **Sí:** borrar con `auth.admin.deleteUser` en Server Action. Razón: la clave pública no puede borrar en `auth.users`; los cascades ya limpian `profiles` y `scores`.
- **No:** función `SECURITY DEFINER` en BD para borrar. Razón: requiere migración y ampliar superficie RPC; el admin client ya existe.
- **Sí:** home + aviso tras borrar. Razón: confirma al usuario que se completó.
- **Sí:** formulario de contraseña desplegable y zona peligrosa al final. Razón: la tarjeta de perfil sigue corta y el borrado no queda junto a acciones habituales.
- **No:** migración. Razón: cascades ya existentes (0010, 0013).

---

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Borrado irreversible por error                                                   | Modal + escribir username; aviso explícito de que borra puntuaciones                                |
| `signInWithPassword` de verificación reescribe las cookies de sesión             | Mismo usuario; se usa ese cliente para `updateUser`/`signOut others`; verificar que la sesión sigue |
| "Secure password change" de Supabase exige reautenticación con sesiones antiguas | La verificación inicia una sesión nueva justo antes de `updateUser`                                 |
| `app_metadata.providers` no refleja una identidad email                          | Verificar con cuenta email y OAuth en el paso 1; la acción vuelve a comprobarlo en servidor         |
| Uso indebido del admin client                                                    | Solo en Server Action, `server-only`, id tomado de `getUser()`; revisar con `security-auditor`      |
| Prod sin `SUPABASE_SECRET_KEY`                                                   | Ya requerida por SPEC 16/17; el borrado devuelve error genérico si falta                            |

---

## Qué **no** entra en esta spec

- Cambiar email, añadir contraseña a cuentas OAuth, vincular proveedores.
- Periodo de gracia, exportar datos, emails de aviso.

Cada uno, si llega, va en su propia spec.
