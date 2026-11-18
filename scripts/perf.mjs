// Mide FPS y JS/frame de cada juego y skin con CPU x1 y x6 (SPEC 14).
// Uso: con `npm run dev` activo, `npm run perf`. URL base: PERF_URL; PERF_GAMES=a,b limita juegos; PERF_HEADLESS=1 sin ventana.
import { chromium } from "playwright";

const BASE = process.env.PERF_URL ?? "http://localhost:3000";
const GAMES = process.env.PERF_GAMES?.split(",") ?? [
  "asteroids",
  "tetris",
  "arkanoid",
  "snake",
  "frogger",
];
const RATES = [1, 6];
const MIN_FPS = 58;
const WARMUP_MS = 1000;
const SAMPLE_MS = 3000;

// Envuelve requestAnimationFrame: cuenta frames y el tiempo JS de cada callback.
const INIT = () => {
  const stats = { frames: 0, js: 0, on: false };
  window.__perf = stats;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      const t0 = performance.now();
      cb(t);
      if (stats.on) {
        stats.js += performance.now() - t0;
        stats.frames++;
      }
    });
};

async function measure(page, cdp, rate) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await page.waitForTimeout(WARMUP_MS);
  await page.evaluate(() => {
    window.__perf.frames = 0;
    window.__perf.js = 0;
    window.__perf.on = true;
  });
  await page.waitForTimeout(SAMPLE_MS);
  const r = await page.evaluate(() => {
    window.__perf.on = false;
    return { frames: window.__perf.frames, js: window.__perf.js };
  });
  return {
    fps: (r.frames / SAMPLE_MS) * 1000,
    js: r.frames ? r.js / r.frames : 0,
  };
}

const browser = await chromium.launch({
  // Con ventana por defecto: el headless pinta por software y no es representativo.
  headless: process.env.PERF_HEADLESS === "1",
  args: [
    "--enable-gpu-rasterization",
    "--ignore-gpu-blocklist",
    "--enable-zero-copy",
  ],
});
const rows = [];
let failed = false;

for (const game of GAMES) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(INIT);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const cdp = await context.newCDPSession(page);

  await page.goto(`${BASE}/juegos/${game}/jugar`, { waitUntil: "networkidle" });
  const select = page.locator(".player-hud select").first();
  await select.waitFor();
  const skins = await select
    .locator("option")
    .evaluateAll((os) => os.map((o) => o.value));

  for (const skin of skins) {
    await select.selectOption(skin);
    const row = { game, skin };
    for (const rate of RATES) {
      const m = await measure(page, cdp, rate);
      row[`fps${rate}`] = m.fps.toFixed(0);
      row[`js${rate}`] = m.js.toFixed(2);
      if (rate === 6 && m.fps < MIN_FPS) {
        failed = true;
        row.fail = "<58";
      }
    }
    rows.push(row);
  }
  if (errors.length) {
    failed = true;
    console.error(`[${game}] errores en consola:`, errors);
  }
  await context.close();
}

await browser.close();

console.table(
  rows.map((r) => ({
    juego: r.game,
    skin: r.skin,
    "FPS x1": r.fps1,
    "JS/frame x1 (ms)": r.js1,
    "FPS x6": r.fps6,
    "JS/frame x6 (ms)": r.js6,
    "": r.fail ?? "ok",
  })),
);
process.exit(failed ? 1 : 0);
