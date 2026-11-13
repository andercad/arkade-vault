## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test runner configured.

## Specs (`specs/`)

| Spec | Contenido |
|------|-----------|
| `01-mvp-pantallas.md` | MVP visual: 5 pantallas con datos mock |
| `02-homepage.md` | Home en `/`, Biblioteca movida a `/juegos`, nav completa |
| `03-about-contacto.md` | `/about` + formulario de contacto (Resend, Server Action) |
| `04-supabase-cimientos.md` | Supabase: clientes, migraciones, tipos generados |

### Buenas prácticas

- Una spec por cambio, numerada `NN-nombre.md`, en `specs/`.
- Cabecera fija: **Estado**, **Depende de**, **Fecha**, **Objetivo**.
- Secciones: Por qué existe, Alcance (dentro / fuera), Plan de implementación, Criterios de aceptación, Decisiones, Riesgos.
- Alcance pequeño; lo demás va explícito en "Fuera de alcance" para specs futuras.
- Crear con `/spec`, implementar con `/spec-impl`, un commit por paso (`NN-nombre: Paso N`).
- Marcar **Estado: Implementado** al terminar; actualizar la spec si cambian decisiones.
