import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const abs = path.resolve(filePath);
const rel = path.relative(root, abs).split(path.sep).join("/");

const ignored = [
  "..",
  "node_modules/",
  ".next/",
  "references/",
  ".playwright-mcp/",
  ".playwright-screenshots/",
  ".sonarlint/",
  ".agents/",
  ".claude/",
];
if (path.isAbsolute(rel) || ignored.some((p) => rel === p || rel.startsWith(p.endsWith("/") ? p : p + "/"))) {
  process.exit(0);
}

const run = (args, cwd = root) =>
  spawnSync("npx", args, { cwd, encoding: "utf8", shell: true });

const angularDir = path.join(root, "angular");
const isAngular = rel.startsWith("angular/");

// Prettier: formatea cualquier tipo soportado (ignora desconocidos).
// En angular/ ya lo hace el hook del plugin `angular` (evita doble escritura en paralelo).
if (!isAngular) {
  const prettier = run(["prettier", "--write", "--ignore-unknown", `"${abs}"`]);
  if (prettier.status !== 0) {
    console.error(prettier.stderr || prettier.stdout);
    process.exit(2);
  }
}

// ESLint de angular/ (angular-eslint, plantillas .html incluidas): solo si ya existe
// su config; el ESLint de la raíz ignora angular/**.
if (isAngular && /\.(ts|html)$/.test(abs)) {
  const hasConfig = ["eslint.config.js", "eslint.config.mjs"].some((f) =>
    existsSync(path.join(angularDir, f)),
  );
  if (hasConfig) {
    const eslint = run(["eslint", "--fix", `"${abs}"`], angularDir);
    if (eslint.status !== 0) {
      console.error(eslint.stdout + eslint.stderr);
      process.exit(2);
    }
  }
  process.exit(0);
}

// ESLint: solo archivos JS/TS
if (/\.(m?[jt]sx?|cjs)$/.test(abs)) {
  const eslint = run(["eslint", "--fix", "--no-warn-ignored", `"${abs}"`]);
  if (eslint.status !== 0) {
    console.error(eslint.stdout + eslint.stderr);
    process.exit(2);
  }
}

process.exit(0);
