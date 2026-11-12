# SPEC 03 — Página Acerca de y formulario de contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-12
> **Objetivo:** Implementar `/about` idéntica a `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real al equipo mediante Resend desde una Server Action.

---

## Por qué existe esta spec

SPEC 02 dejó el link "Acerca de" de la nav apuntando a `/about` con 404 a propósito. El template solo simula el envío (`setSent(...)` sin red). Aquí se porta la página 1:1 y se sustituye la simulación por un envío real, lo que introduce por primera vez código de servidor, una dependencia externa y variables de entorno secretas.

---

## Alcance

**Dentro:**

- Nueva ruta `/about` (Server Component) portada de `about.jsx`:
  - Hero: kicker `▸ ACERCA DE`, título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 highlights con icono SVG pixel (`HEART`, `BROWSER`, `PLANT`), retardos `i * 80ms`.
  - Divisor decorativo `about-divider` con 24 píxeles animados (`i * 80ms`), `aria-hidden`.
  - Sección contacto (`reveal`): intro (kicker `▸ CONTACTO`, "CONTÁCTANOS", subtítulo, 3 tips con LED) y formulario.
- Formulario (componente cliente) con los mismos campos, copy y comportamiento visual del template:
  - Campos NOMBRE, CORREO ELECTRÓNICO, MENSAJE; botón "▶  ENVIAR MENSAJE".
  - Validación cliente de campos vacíos con animación `shake` (400 ms), sin enviar.
  - Éxito: bloque `terminal-success` con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}." y botón "ENVIAR OTRO MENSAJE" que limpia el formulario.
- Envío real: Server Action `sendContactMessage` que valida en servidor y envía con Resend un único correo al equipo.
  - `to` = `CONTACT_TO_EMAIL`, `from` = `CONTACT_FROM_EMAIL`, `replyTo` = correo del visitante.
  - Asunto `[Arcade Vault] Mensaje de {nombre}`; cuerpo en texto plano con nombre, correo y mensaje.
- Protección anti-spam: campo honeypot oculto; si viene relleno la acción responde éxito sin enviar.
- Estado de error (no existe en el template): si falla validación servidor o Resend, el formulario sigue visible y muestra un mensaje de error con estilo terminal (`[ERROR] ...`), sin perder lo escrito.
- Estado "enviando": botón deshabilitado con texto "ENVIANDO…" mientras la acción está pendiente.
- Portar a `app/globals.css` los estilos de `/* ===== ABOUT PAGE ===== */` en adelante de `references/templates/home-about/styles.css` (línea ~1071 hasta el final), sin duplicar clases ya presentes (`.field`, `.btn.xl`, `.fade-in`, `.neon-*`). Añadir solo lo mínimo para `.field textarea` y el estado de error si faltan.
- Dependencia `resend` en `package.json` y variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.
- Metadata de `/about` (`title`).

**Fuera de alcance (specs futuras):**

- Correo de acuse al visitante.
- Dominio propio verificado en Resend (se usa el remitente de pruebas, ver Decisiones).
- Rate limit por IP, CAPTCHA o cualquier antispam más allá del honeypot.
- Guardar mensajes en base de datos o panel de administración.
- Plantilla HTML / React Email para el correo (texto plano).
- Prellenar nombre/correo con la sesión (`av_user`).
- Cambios en la nav (el link y la regla de activo `/about*` ya existen desde SPEC 02).
- Tests automatizados, i18n.

---

## Modelo de datos

```ts
// lib/contact.ts
export const CONTACT_LIMITS = { name: 60, email: 120, message: 2000 } as const;

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: string };   // error: texto en español para mostrar en pantalla

export function validateContact(raw: Record<string, unknown>): { ok: true; data: ContactInput } | { ok: false; error: string };
```

```ts
// app/about/actions.ts  ("use server")
export async function sendContactMessage(formData: FormData): Promise<ContactResult>;
```

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

```
RESEND_API_KEY=       # clave de la cuenta Resend
CONTACT_TO_EMAIL=     # destinatario del equipo
CONTACT_FROM_EMAIL=   # remitente; onboarding@resend.dev mientras no haya dominio verificado
```

Convenciones:

- Campos del `FormData`: `name`, `email`, `message` y honeypot `website`.
- Validación servidor: los tres campos con `trim()` no vacíos, email con regex simple, longitudes según `CONTACT_LIMITS`.
- Nombre del `{NOMBRE}` en éxito en mayúsculas, igual que el template (`toUpperCase()`).
- El texto del mensaje y el nombre se envían como texto plano; no se interpolan en HTML.
- Los secretos solo se leen en la Server Action; si falta alguna variable se responde `{ ok: false }` con error genérico y se registra `console.error` en servidor.

---

## Plan de implementación

1. Instalar `resend` (`npm i resend`), crear `.env.local` con las 3 variables, y añadir `env.template` con las claves vacías (no empieza por `.env`, así que `.env*` del `.gitignore` no lo ignora y no hace falta excepción). Verificación: `npx tsc --noEmit` pasa; `.env.local` no aparece en `git status`.
2. Crear `lib/contact.ts` con `CONTACT_LIMITS`, tipos y `validateContact`. Verificación: `npx tsc --noEmit` pasa.
3. Crear `app/about/actions.ts` con `sendContactMessage`: honeypot, validación, envío con Resend (`replyTo`, texto plano), manejo de `error` de Resend y de variables ausentes. Verificación: `npx tsc --noEmit` pasa.
4. Portar los estilos de About a `app/globals.css`. Verificación: `npm run build` pasa; sin colisiones con clases existentes.
5. Crear componentes de presentación Server: `components/about/highlight-icon.tsx` (3 iconos SVG del template) y `components/about/about-hero.tsx` (hero + highlights + divisor). Verificación: compilan aisladamente (`tsc`).
6. Crear `components/about/contact-form.tsx` (cliente): estado `form`, `sent`, `shake`, `pending`, `error`, honeypot oculto, validación cliente, llamada a la acción y bloque `terminal-success`. Verificación: `tsc` y `lint` pasan.
7. Crear `app/about/page.tsx` componiendo hero, divisor y sección de contacto (intro + `ContactForm`), reutilizando `components/home/reveal.tsx` para `reveal`, con `metadata`. Verificación: `/about` muestra la página con el aspecto del template y deja de dar 404; el link "Acerca de" de la nav queda activo.
8. Probar el envío real con credenciales válidas y los casos de error (campos vacíos, email inválido, honeypot, API key inválida). Verificación: `npm run lint` y `npm run build` pasan; el correo llega al destinatario.

Antes del paso 1, leer la guía relevante de `node_modules/next/dist/docs/` (Server Actions / forms, variables de entorno, metadata), según `AGENTS.md`. Para el diseño visual aplicar `/frontend-design`, según `CLAUDE.md`. Para la API de Resend, consultar su documentación vigente (`emails.send`, campos `from`, `to`, `replyTo`, `subject`, `text`) antes de codificar.

---

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `/about` responde 200 y carga sin errores en la consola del navegador.
- [x] La página muestra, en orden: "ACERCA DE ARCADE VAULT", 3 highlights, divisor de 24 píxeles, "CONTÁCTANOS", 3 tips y el formulario.
- [x] El copy, símbolos (`▸`, `▶`, `❤️`) y mayúsculas coinciden con `about.jsx`.
- [x] Los highlights usan las clases `magenta`, `cyan` y `green` con iconos SVG distintos.
- [x] Las secciones con clase `reveal` reciben la clase `in` al entrar en el viewport.
- [x] La nav marca "Acerca de" activa en `/about` en escritorio y en el panel móvil.
- [c] Enviar con cualquier campo vacío (o solo espacios) activa `shake` ~400 ms y no llama a la Server Action.
- [x] Con datos válidos y credenciales correctas, el correo llega a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {nombre}`, y su `Reply-To` es el correo del visitante.
- [x] Tras el envío se muestra `terminal-success` con "GRACIAS, {NOMBRE}." en mayúsculas.
- [x] "ENVIAR OTRO MENSAJE" vuelve al formulario con los 3 campos vacíos.
- [x] Durante el envío el botón está deshabilitado y muestra "ENVIANDO…".
- [x] Un correo inválido (p. ej. `abc`) es rechazado por el servidor con mensaje de error visible y el formulario conserva lo escrito.
- [x] Un mensaje de más de 2000 caracteres es rechazado con mensaje de error visible.
- [x] Con `RESEND_API_KEY` inválida se muestra un error genérico en estilo terminal, el formulario sigue visible y no se filtra el detalle del error de Resend al cliente.
- [x] Con el honeypot `website` relleno la acción responde éxito y no se envía ningún correo.
- [x] `RESEND_API_KEY` no aparece en el bundle cliente (búsqueda en `.next/static` sin coincidencias).
- [x] `.env.local` no está versionado y `env.template` sí.
- [x] No hay hydration warnings al cargar `/about`.
- [x] En ancho ≤ 900px el `contact-grid` pasa a 1 columna.

---

## Decisiones

- **Sí:** Server Action para el envío. Sin endpoint público que mantener y la API key nunca llega al cliente.
- **No:** Route Handler `/api/contact`. Más código y superficie expuesta sin necesidad de llamarlo desde fuera.
- **Sí:** el remitente `CONTACT_FROM_EMAIL` es `onboarding@resend.dev` mientras no haya dominio verificado. Gmail y otros dominios públicos no se pueden verificar en Resend, así que `ander.cadaval@gmail.com` (indicado en la fase de preguntas) se interpreta como correo de la cuenta Resend y destinatario `CONTACT_TO_EMAIL`, no como `from`. Resend solo entrega con el remitente de pruebas al correo dueño de la cuenta, así que ambos encajan. Los valores reales viven en `.env.local`, no en la spec ni en el repo.
- **No:** dominio propio verificado ahora. Requiere DNS y es un paso de despliegue, no de esta spec.
- **Sí:** un solo correo al equipo con `replyTo` = visitante. Responder desde el buzón del equipo va directo al visitante.
- **No:** acuse al visitante. Con el remitente de pruebas no se puede entregar a terceros y duplica la superficie de abuso.
- **Sí:** validación en cliente (shake, como el template) y de nuevo en servidor. El cliente es solo UX; el servidor es la barrera real.
- **Sí:** honeypot `website` oculto con CSS y `tabIndex={-1}`, `autoComplete="off"`. Frena bots simples sin fricción para humanos.
- **No:** rate limit o CAPTCHA. En memoria no es fiable en serverless y un CAPTCHA añade dependencias y UX; merece su propia spec si hay abuso.
- **Sí:** estado de error con estilo terminal (`[ERROR] ...`) que mantiene el formulario. El template no lo tiene y un fallo de red real no puede quedar mudo.
- **Sí:** correo en texto plano. Evita inyección HTML con contenido del visitante y no necesita plantilla.
- **No:** React Email / HTML. Dependencia extra sin valor para un buzón interno.
- **Sí:** fidelidad 1:1 con el template (copy, animaciones, clases CSS, iconos). Lo único añadido es lo que la integración real exige: estado "enviando" y estado de error.
- **Sí:** reutilizar `components/home/reveal.tsx`. Renderiza `<section>`, y el divisor del template es un `<div>`; se acepta `<section aria-hidden>` porque el CSS usa solo la clase.
- **Sí:** `/about` como Server Component; `"use client"` solo en `contact-form.tsx` y en `Reveal` (ya existente).
- **No:** prellenar con la sesión (`av_user`). Mejora futura.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Remitente `onboarding@resend.dev` solo entrega al correo dueño de la cuenta | `CONTACT_TO_EMAIL` = correo de la cuenta Resend; documentado en `env.template`. Cambiar `CONTACT_FROM_EMAIL` cuando haya dominio verificado. |
| `RESEND_API_KEY` filtrada al cliente o al repo | Leerla solo en `actions.ts`; sin prefijo `NEXT_PUBLIC_`; `.env*` ignorado y `env.template` versionado sin valores; criterio de aceptación de búsqueda en `.next/static`. |
| Abuso del endpoint de la Server Action (spam masivo, cuota de Resend) | Validación servidor, límites de longitud y honeypot; rate limit/CAPTCHA diferidos a otra spec. |
| Resend cambia la API respecto a la memoria del modelo | Consultar la documentación vigente antes del paso 3; verificar con un envío real en el paso 8. |
| Variables de entorno ausentes en otro entorno | La acción responde error genérico y registra `console.error`; `env.template` documenta las claves. |
| Server Actions en Next 16 con diferencias respecto al conocimiento previo | Leer `node_modules/next/dist/docs/` antes de codificar, como exige `AGENTS.md`. |
| Inyección de cabeceras o HTML vía nombre/mensaje | Texto plano, `subject` construido con el nombre recortado y sin saltos de línea (`replace(/[\r\n]+/g, " ")`). |
| CSS de About choca con clases existentes | Revisar antes de pegar; no duplicar reglas ya presentes. |
| `.reveal` oculta la sección de contacto si el observer falla | `Reveal` ya añade `in` si no existe `IntersectionObserver`; verificar con Playwright que acaba visible. |

---

## Qué **no** está en esta spec

- Correo de acuse al visitante.
- Dominio propio verificado en Resend.
- Rate limit, CAPTCHA o antispam más allá del honeypot.
- Base de datos, panel o histórico de mensajes.
- Plantillas HTML / React Email.
- Prellenado desde la sesión.
- Cambios en la nav, tests automatizados, i18n.

Cada uno, si llega, va en su propia spec.
