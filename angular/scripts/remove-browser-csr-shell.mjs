// En Vercel el CDN sirve `browser/index.csr.html` para `/` antes de llegar a la función SSR,
// y la home se queda sin renderizar en servidor (SPEC 27). El servidor Angular conserva su copia
// del shell en el manifest, así que las rutas `Client` (/login, /juegos/:id/jugar) siguen funcionando.
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const shell = fileURLToPath(
  new URL('../dist/arcade-vault-angular/browser/index.csr.html', import.meta.url),
);

rmSync(shell, { force: true });
