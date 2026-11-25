// SPEC 20: createAuthActionClient() usa la clave secreta (salta RLS). Solo vale
// para llamadas `auth.*`; falla si en app/ o lib/ su cliente llama a .from( o .rpc(.
// Heurística por archivo (no sigue el cliente si se pasa a otras funciones).
// Uso: npm run check:secret-client
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["app", "lib"];
const DEFINITION = join("lib", "supabase", "server.ts");
const EXT = /\.(ts|tsx|mjs|js)$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.test(name)) yield p;
  }
}

const violations = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (file === DEFINITION) continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes("createAuthActionClient")) continue;

    const lines = src.split("\n");
    // Variables que reciben el cliente: const x = await createAuthActionClient()
    const vars = new Set();
    for (const m of src.matchAll(
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?createAuthActionClient\s*\(/g,
    )) {
      vars.add(m[1]);
    }

    lines.forEach((line, i) => {
      const report = (what) =>
        violations.push(`${relative(".", file)}:${i + 1}  ${what}`);
      // Uso directo encadenado: (await createAuthActionClient()).from(
      if (
        /createAuthActionClient\s*\([^)]*\)\s*\)?\s*\.(from|rpc)\s*\(/.test(
          line,
        )
      ) {
        report("createAuthActionClient() con .from(/.rpc(");
      }
      for (const v of vars) {
        if (new RegExp(`\\b${v}\\s*\\.(from|rpc)\\s*\\(`).test(line)) {
          report(`'${v}' (clave secreta) con .from(/.rpc(`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error(
    "✗ createAuthActionClient (clave secreta) solo puede usarse con auth.*:",
  );
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}
console.log("✓ createAuthActionClient solo se usa con auth.*");
