---
paths:
  - supabase/migrations/**
  - lib/supabase/**
  - lib/auth.tsx
  - lib/auth-validation.ts
  - app/login/**
  - app/auth/**
  - proxy.ts
  - next.config.ts
  - database.types.ts
  - package.json
---

# Regla: security-auditor

- Tras modificar estos archivos (migración, policies, auth, proxy, headers, deps), al terminar el cambio/spec y antes del merge o la PR: proponer lanzar el subagente `security-auditor`. No lanzarlo sin confirmación.
- Lanzarlo con `npm run dev` activo (si no, los checks `curl -I` quedan "no verificado").
- Solo si la rama/spec tocó alguno de estos archivos: como máximo una auditoría, al final, no a mitad de cambio ni una por archivo editado.
- Es de solo lectura: no pedirle que corrija. Hallazgo Crítico/Alto → crear spec con `/spec` y corregir con `/spec-impl`.
- Tras la auditoría, recordar al usuario los checks `manual` (panel Supabase).
- No usarlo para cambios solo de UI/skins/performance/juegos sin migración.
