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

// SPEC 26: app Angular. Los clientes de clave secreta (`authClient` = auth.*,
// `adminClient` = email_for_username + auth.admin) llegan inyectados (`deps.authClient(...)`)
// y las cadenas ocupan varias líneas, así que se analiza el archivo entero.
const ANGULAR_SERVER = join("angular", "src", "server");
const ANGULAR_DEFINITION = join(ANGULAR_SERVER, "supabase.ts");
const ANGULAR_SPEC = /\.spec\.ts$/;
const SECRET_FACTORY =
  "(?:createAuthActionClient|createAdminClient|authClient|adminClient)";
const ALLOWED_RPC = "email_for_username";

/** Número de línea (1-based) de un índice del texto. */
const lineOf = (src, index) => src.slice(0, index).split("\n").length;

function checkAngularServer() {
  let files;
  try {
    files = [...walk(ANGULAR_SERVER)];
  } catch {
    return; // sin angular/src/server (p. ej. checkout parcial)
  }
  for (const file of files) {
    if (file === ANGULAR_DEFINITION || ANGULAR_SPEC.test(file)) continue;
    const src = readFileSync(file, "utf8");
    if (!new RegExp(SECRET_FACTORY).test(src)) continue;
    const report = (index, what) =>
      violations.push(`${relative(".", file)}:${lineOf(src, index)}  ${what}`);

    // Uso encadenado: deps.adminClient().rpc(...), createAuthActionClient(...).from(...)
    const chained = new RegExp(
      `${SECRET_FACTORY}\\s*\\([^)]*\\)\\s*\\)?\\s*\\.(from|rpc)\\s*\\(\\s*(['"\`][^'"\`]*['"\`])?`,
      "g",
    );
    for (const m of src.matchAll(chained)) {
      const isAllowed = m[1] === "rpc" && m[2]?.slice(1, -1) === ALLOWED_RPC;
      if (!isAllowed) {
        report(m.index, `cliente de clave secreta con .${m[1]}(${m[2] ?? ""})`);
      }
    }

    // Variable que guarda el cliente: const c = deps.authClient(req, res);
    const vars = new Set();
    for (const m of src.matchAll(
      new RegExp(
        `(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:await\\s+)?(?:deps\\.)?${SECRET_FACTORY}\\s*\\([^)]*\\)\\s*;`,
        "g",
      ),
    )) {
      vars.add(m[1]);
    }
    for (const v of vars) {
      for (const m of src.matchAll(
        new RegExp(`\\b${v}\\s*\\.(from|rpc)\\s*\\(`, "g"),
      )) {
        report(m.index, `'${v}' (clave secreta) con .${m[1]}(`);
      }
    }
  }
}

// El navegador nunca debe llevar claves del servidor (nombres de variable) en el build.
const BROWSER_DIST = join("angular", "dist", "arcade-vault-angular", "browser");
const FORBIDDEN_IN_BUNDLE = ["SUPABASE_SECRET_KEY", "RESEND_API_KEY"];

function checkAngularBundle() {
  let files;
  try {
    files = [...walk(BROWSER_DIST)];
  } catch {
    return false; // sin build: no se comprueba
  }
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const name of FORBIDDEN_IN_BUNDLE) {
      if (src.includes(name)) {
        violations.push(`${relative(".", file)}  contiene ${name}`);
      }
    }
  }
  return true;
}

checkAngularServer();
const bundleChecked = checkAngularBundle();

if (violations.length) {
  console.error(
    "✗ Los clientes de clave secreta solo pueden usarse con auth.* (y email_for_username):",
  );
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}
console.log("✓ Clave secreta solo con auth.* (app/, lib/, angular/src/server)");
console.log(
  bundleChecked
    ? "✓ Sin claves de servidor en angular/dist/**/browser"
    : "· angular/dist sin compilar: bundle no comprobado",
);
