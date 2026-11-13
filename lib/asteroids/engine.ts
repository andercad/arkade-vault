import { H, POINTS, TRIPLE_DURATION, W } from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  type Keys,
} from "./entities";
import type {
  AsteroidsCallbacks,
  AsteroidsGame,
  AsteroidsSnapshot,
} from "./types";
import { dist, rand, randInt } from "./utils";

// Teclas cuyo comportamiento por defecto (scroll, activar botón con foco) se bloquea.
const BLOCKED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
];
const PAUSE_KEYS = ["Escape", "KeyP"];

type State = "playing" | "dead" | "gameover";

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return {
      start: noop,
      pause: noop,
      resume: noop,
      restart: noop,
      end: noop,
      destroy: noop,
    };
  }

  // ── Estado ────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUp: PowerUp | null = null;
  let killCount = 0;
  let powerUpAt = 0;
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let paused = false;

  let started = false;
  let destroyed = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let lastSnap: AsteroidsSnapshot | null = null;

  // ── Input ─────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};

  function clearKeys() {
    for (const k of Object.keys(keys)) delete keys[k];
    for (const k of Object.keys(justPressed)) delete justPressed[k];
  }

  function pressed(code: string): boolean {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();

    if (PAUSE_KEYS.includes(e.code)) {
      if (!e.repeat && state !== "gameover") {
        if (paused) resume();
        else pause();
      }
      return;
    }

    // En pausa o game over las teclas de juego no se registran.
    if (paused || state === "gameover") return;
    if (!e.repeat) justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    // Evita que Espacio active un botón con foco al soltarlo.
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();
    keys[e.code] = false;
  }

  function onBlur() {
    clearKeys();
  }

  // ── Estado de partida ─────────────────────────────────────────────────────
  // Elige al azar en qué destrucción del nivel aparece el power-up
  // (cada gran asteroide = 7 destrucciones).
  function resetLevelPowerUp(nLarge: number) {
    killCount = 0;
    powerUpAt = randInt(1, nLarge * 7 - 3);
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUp = null;
    resetLevelPowerUp(4);
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    deadTimer = 0;
    paused = false;
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    const triple = ship.tripleTimer; // el efecto persiste entre niveles
    ship.reset();
    ship.tripleTimer = triple;
    resetLevelPowerUp(3 + level);
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function gameOver() {
    if (state === "gameover") return;
    state = "gameover";
    paused = false;
    clearKeys();
    notify();
    callbacks.onGameOver(score);
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Notificación a React (solo ante cambios) ──────────────────────────────
  function snapshot(): AsteroidsSnapshot {
    return {
      score,
      lives,
      level,
      tripleSeconds: ship.tripleTimer > 0 ? Math.ceil(ship.tripleTimer) : 0,
      status: paused ? "paused" : state,
    };
  }

  function notify() {
    const s = snapshot();
    const p = lastSnap;
    if (
      p &&
      p.score === s.score &&
      p.lives === s.lives &&
      p.level === s.level &&
      p.tripleSeconds === s.tripleSeconds &&
      p.status === s.status
    ) {
      return;
    }
    lastSnap = s;
    callbacks.onState(s);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function updatePowerUp(dt: number) {
    if (!powerUp) return;
    powerUp.update(dt);
    if (powerUp.dead) {
      powerUp = null;
    } else if (
      !ship.dead &&
      dist(ship, powerUp) < ship.radius + powerUp.radius
    ) {
      ship.tripleTimer = TRIPLE_DURATION;
      explode(powerUp.x, powerUp.y, 6);
      powerUp = null;
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      updatePowerUp(dt);
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    updatePowerUp(dt);

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          killCount++;
          if (killCount === powerUpAt && !powerUp) {
            powerUp = new PowerUp(a.x, a.y);
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawLifeIcon(c: CanvasRenderingContext2D, x: number, y: number) {
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.strokeStyle = "#fff";
    c.lineWidth = 1.2;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-6, -5);
    c.lineTo(-3, 0);
    c.lineTo(-6, 5);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D) {
    c.fillStyle = "#fff";
    c.font = "15px monospace";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    if (ship.tripleTimer > 0) {
      c.fillStyle = "#0ff";
      c.textAlign = "left";
      c.fillText(`TRIPLE ${Math.ceil(ship.tripleTimer)}s`, 14, 46);
    }

    for (let i = 0; i < lives; i++) drawLifeIcon(c, W - 16 - i * 22, 18);
  }

  // Sin overlays de pausa ni game over: los dibuja el contenedor (React).
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    bullets.forEach((b) => b.draw(c));
    if (powerUp) powerUp.draw(c);
    ship.draw(c);

    drawHUD(c);
  }

  // ── Bucle principal ───────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!paused) update(dt);
    draw(ctx!);
    notify();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ───────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || paused || state === "gameover") return;
    paused = true;
    clearKeys();
    notify();
  }

  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    clearKeys();
    lastTime = null; // evita un dt enorme tras la pausa
    notify();
  }

  function restart() {
    if (destroyed) return;
    clearKeys();
    initGame();
    lastTime = null;
    notify();
  }

  function end() {
    if (destroyed || state === "gameover") return;
    ship.dead = true;
    gameOver();
  }

  function start() {
    if (started || destroyed) return;
    started = true;
    initGame();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    notify();
    rafId = requestAnimationFrame(loop);
  }

  function destroy() {
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    clearKeys();
  }

  return { start, pause, resume, restart, end, destroy };
}
