/**
 * Función de Vercel (SPEC 27): todo lo que no es un estático del CDN llega aquí por el
 * rewrite de `vercel.json` y lo resuelve la app Express/Angular SSR del build
 * (`src/server.ts` → `reqHandler`, un `(req, res)` de Node). La detección automática del
 * preset de Angular no enlaza el servidor con este build, de ahí el wrapper.
 */
export { reqHandler as default } from '../dist/arcade-vault-angular/server/server.mjs';
