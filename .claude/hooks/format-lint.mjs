import { readFileSync } from "node:fs";
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

const run = (args) =>
  spawnSync("npx", args, { cwd: root, encoding: "utf8", shell: true });

// Prettier: formatea cualquier tipo soportado (ignora desconocidos)
const prettier = run(["prettier", "--write", "--ignore-unknown", `"${abs}"`]);
if (prettier.status !== 0) {
  console.error(prettier.stderr || prettier.stdout);
  process.exit(2);
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
