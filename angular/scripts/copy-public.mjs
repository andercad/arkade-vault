// El builder de Angular no acepta assets fuera del workspace (`../public`):
// se copia public/ de la raíz a angular/public/ antes de build/start (SPEC 24).
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../public/', import.meta.url));
const to = fileURLToPath(new URL('../public/', import.meta.url));

if (existsSync(from)) cpSync(from, to, { recursive: true, force: true });
