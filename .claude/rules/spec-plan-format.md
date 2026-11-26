---
paths:
  - specs/**
---

# Formato del plan de implementación en specs

Aplica al crear o editar specs (`/spec`, `/add-game`, `game-jam`). Prevalece sobre el ejemplo de lista plana de `template.md` de la skill `/spec` (externa, no se edita).

Cada paso del "Plan de implementación" lleva título en negrita y **dos listas**:

```markdown
1. **Título corto del paso.**
   - **Acciones:**
     - Crear `lib/x.ts` con …
     - Registrar … en `lib/game-registry.ts`.
   - **Verificaciones:**
     - `npx tsc --noEmit` sin errores.
     - `/juegos/x/jugar` monta el canvas.
```

Reglas:

- ≥1 acción y ≥1 verificación por paso, siempre como listas (nunca prosa ni una línea `Verificación:` suelta).
- Orden fijo: `Acciones` y luego `Verificaciones`.
- Verificaciones observables: comando, URL, consulta o comportamiento visible. No "funciona bien".
- Rutas y comandos entre backticks.
- Etiquetas en el idioma de la spec (inglés: `Actions` / `Verifications`).
- Cada paso sigue siendo commiteable por sí solo.
