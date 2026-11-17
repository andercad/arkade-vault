import {
  BALL_SIZE,
  BRICK_POINTS,
  CANVAS_H,
  CANVAS_W,
  CLASSIC_BG,
  EXPLOSION_DURATION,
  INITIAL_LIVES,
  LEVEL_COUNT,
  MAX_BOUNCE_ANGLE,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  PARTICLE_GRAVITY,
  PARTICLE_LIFE,
  PARTICLE_SIZE,
  SOUND_BOUNCE_SRC,
  SOUND_BREAK_SRC,
} from "./constants";
import {
  createBricks,
  spawnParticles,
  type Brick,
  type Explosion,
  type Particle,
} from "./entities";
import { loadSpritesheet } from "./sprites";
import { DEFAULT_SKIN, SKINS, type Skin } from "./skins";
import type {
  ArkanoidCallbacks,
  ArkanoidGame,
  ArkanoidSnapshot,
  ArkanoidStatus,
  SkinName,
} from "./types";
import { ballSpeed, clamp } from "./utils";

// Teclas cuyo comportamiento por defecto (scroll, activar botón con foco) se bloquea.
const BLOCKED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "Space",
];
const PAUSE_KEYS = ["Escape", "KeyP"];

// "levelcomplete" se notifica como status "playing" (la plataforma no lo distingue).
type Phase = "playing" | "levelcomplete" | "paused" | "gameover";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  stuck: boolean;
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame {
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
      setSkin: noop,
    };
  }

  // Audios base (se clonan al reproducir para poder solaparse).
  const sounds = {
    bounce: new Audio(SOUND_BOUNCE_SRC),
    brk: new Audio(SOUND_BREAK_SRC),
  };

  let phase: Phase = "playing";
  let resumePhase: Phase = "playing"; // fase a la que vuelve resume()
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  const paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE, stuck: true };
  let bricks: Brick[] = [];
  let explosions: Explosion[] = [];
  let particles: Particle[] = [];
  const keys = { left: false, right: false };

  let skin: Skin = SKINS[DEFAULT_SKIN];
  let sheet: CanvasImageSource | null = null;
  let cancelLoad: (() => void) | null = null;
  let started = false;
  let destroyed = false;
  let overReported = false;
  let rafId = 0;
  let lastTime = 0;
  let resetClock = false; // el próximo frame no acumula dt (tras resume/restart)
  let lastSnap: ArkanoidSnapshot | null = null;

  // ── Snapshot ──────────────────────────────────────────────────────────────
  function notify() {
    const status: ArkanoidStatus =
      phase === "gameover"
        ? "gameover"
        : phase === "paused"
          ? "paused"
          : "playing";
    const p = lastSnap;
    if (
      p &&
      p.score === score &&
      p.lives === lives &&
      p.level === level &&
      p.status === status
    ) {
      return;
    }
    const s: ArkanoidSnapshot = { score, lives, level, status };
    lastSnap = s;
    callbacks.onState(s);
  }

  // ── Sonido ────────────────────────────────────────────────────────────────
  function playSound(audio: HTMLAudioElement) {
    if (destroyed || phase === "paused") return;
    // catch: el navegador puede bloquear la reproducción (autoplay)
    (audio.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }

  // ── Lógica ────────────────────────────────────────────────────────────────
  function stickBall() {
    ball.stuck = true;
    ball.vx = 0;
    ball.vy = 0;
    ball.x = paddle.x + (paddle.w - ball.size) / 2;
    ball.y = paddle.y - ball.size;
  }

  function launchBall() {
    ball.stuck = false;
    ball.vx = 0;
    ball.vy = -ballSpeed(level);
  }

  // Prepara un nivel: bloques del patrón, sin efectos previos, pala centrada y bola pegada.
  function startLevel(n: number) {
    level = n;
    bricks = createBricks(n);
    explosions = [];
    particles = [];
    paddle.x = (CANVAS_W - PADDLE_W) / 2;
    stickBall();
    phase = "playing";
  }

  function initGame() {
    score = 0;
    lives = INITIAL_LIVES;
    overReported = false;
    resumePhase = "playing";
    keys.left = false;
    keys.right = false;
    startLevel(1);
  }

  function gameOver() {
    phase = "gameover";
    keys.left = false;
    keys.right = false;
    notify();
    if (!overReported) {
      overReported = true;
      callbacks.onGameOver(score);
    }
  }

  // Acción de Espacio / clic según la fase.
  function handleAction() {
    if (phase === "levelcomplete") {
      startLevel(level + 1);
      notify();
    } else if (phase === "playing" && ball.stuck) {
      launchBall();
    }
  }

  function clampPaddle(x: number): number {
    return clamp(x, 0, CANVAS_W - paddle.w);
  }

  function update(dt: number) {
    // Explosiones y partículas envejecen con dt (se congelan en pausa)
    for (const ex of explosions) ex.age += dt * 1000;
    explosions = explosions.filter((ex) => ex.age < EXPLOSION_DURATION);

    for (const p of particles) {
      p.vy += PARTICLE_GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt * 1000;
    }
    particles = particles.filter((p) => p.age < PARTICLE_LIFE);

    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir !== 0) paddle.x = clampPaddle(paddle.x + dir * PADDLE_SPEED * dt);

    if (ball.stuck) {
      // Antes del lanzamiento la bola sigue a la pala
      ball.x = paddle.x + (paddle.w - ball.size) / 2;
      ball.y = paddle.y - ball.size;
      return;
    }
    if (phase !== "playing") return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    let bounced = false; // máximo un sonido de rebote por frame

    // Paredes laterales
    if (ball.x < 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      bounced = true;
    } else if (ball.x + ball.size > CANVAS_W) {
      ball.x = CANVAS_W - ball.size;
      ball.vx = -Math.abs(ball.vx);
      bounced = true;
    }

    // Techo
    if (ball.y < 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      bounced = true;
    }

    // Pala: ángulo según el punto de impacto
    if (
      ball.vy > 0 &&
      ball.x + ball.size > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.size > paddle.y &&
      ball.y < paddle.y + paddle.h
    ) {
      const ballCenter = ball.x + ball.size / 2;
      const paddleCenter = paddle.x + paddle.w / 2;
      // -1 (borde izquierdo) .. 0 (centro) .. 1 (borde derecho)
      const offset = clamp((ballCenter - paddleCenter) / (paddle.w / 2), -1, 1);
      const angle = offset * MAX_BOUNCE_ANGLE; // respecto a la vertical
      const speed = ballSpeed(level);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      ball.y = paddle.y - ball.size;
      bounced = true;
    }
    if (bounced) playSound(sounds.bounce);

    // Bloques: rompe uno por frame e invierte solo el eje de menor solape
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + ball.size <= b.x ||
        ball.x >= b.x + b.w ||
        ball.y + ball.size <= b.y ||
        ball.y >= b.y + b.h
      ) {
        continue;
      }

      const overlapX = Math.min(ball.x + ball.size - b.x, b.x + b.w - ball.x);
      const overlapY = Math.min(ball.y + ball.size - b.y, b.y + b.h - ball.y);
      const ballCX = ball.x + ball.size / 2;
      const ballCY = ball.y + ball.size / 2;
      if (overlapX < overlapY) {
        const fromLeft = ballCX < b.x + b.w / 2;
        ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        ball.x += fromLeft ? -overlapX : overlapX;
      } else {
        const fromTop = ballCY < b.y + b.h / 2;
        ball.vy = fromTop ? -Math.abs(ball.vy) : Math.abs(ball.vy);
        ball.y += fromTop ? -overlapY : overlapY;
      }
      b.alive = false;
      explosions.push({
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        color: b.color,
        age: 0,
      });
      particles.push(...spawnParticles(b, skin.colors));
      playSound(sounds.brk);
      score += BRICK_POINTS;
      break;
    }

    // Nivel completado: no quedan bloques (tras el último nivel, victoria)
    if (bricks.every((b) => !b.alive)) {
      if (level < LEVEL_COUNT) {
        phase = "levelcomplete";
      } else {
        gameOver();
      }
      return;
    }

    // Bola perdida por abajo: resta una vida
    if (ball.y > CANVAS_H) {
      lives--;
      if (lives <= 0) gameOver();
      else stickBall();
    }
  }

  // ── Dibujo ────────────────────────────────────────────────────────────────
  function drawCenteredText(
    text: string,
    y: number,
    font: string,
    color: string,
  ) {
    if (!ctx) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, CANVAS_W / 2, y);
  }

  function draw() {
    if (!ctx || !sheet) return;
    ctx.fillStyle = skin.bg ?? CLASSIC_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    for (const b of bricks) {
      if (b.alive) skin.drawBrick(ctx, sheet, b.color, b.x, b.y, b.w, b.h);
    }
    for (const ex of explosions) {
      const t = ex.age / EXPLOSION_DURATION;
      if (t < 0 || t >= 1) continue;
      skin.drawExplosion(ctx, sheet, ex.color, t, ex.x, ex.y, ex.w, ex.h);
    }
    // Partículas: cuadrados centrados en (x, y) con alpha decreciente
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / PARTICLE_LIFE);
      ctx.fillStyle = p.color;
      ctx.fillRect(
        p.x - PARTICLE_SIZE / 2,
        p.y - PARTICLE_SIZE / 2,
        PARTICLE_SIZE,
        PARTICLE_SIZE,
      );
    }
    ctx.globalAlpha = 1;
    skin.drawPaddle(ctx, sheet, paddle.x, paddle.y, paddle.w, paddle.h);
    skin.drawBall(ctx, sheet, ball.x, ball.y, ball.size);

    // HUD del canvas: puntos, nivel y vidas (derecha). Sin RÉCORD.
    ctx.textAlign = "left";
    ctx.font = "16px monospace";
    ctx.fillStyle = skin.text;
    ctx.fillText(`PUNTOS: ${score}`, 12, 28);
    ctx.fillText(`NIVEL: ${level}`, 200, 28);
    const lifeGap = 6;
    for (let i = 0; i < lives; i++) {
      const lx = CANVAS_W - 12 - BALL_SIZE - i * (BALL_SIZE + lifeGap);
      skin.drawBall(ctx, sheet, lx, 28 - BALL_SIZE + 2, BALL_SIZE);
    }

    if (phase === "levelcomplete") {
      ctx.fillStyle = "rgba(11, 11, 20, 0.7)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      drawCenteredText(
        `NIVEL ${level} COMPLETADO`,
        280,
        "bold 36px monospace",
        "#7CFC00",
      );
      drawCenteredText(
        "Espacio o clic para continuar",
        330,
        "16px monospace",
        "#cccccc",
      );
    } else if (phase === "playing" && ball.stuck) {
      drawCenteredText(
        "Espacio o clic para lanzar",
        400,
        "14px monospace",
        "#cccccc",
      );
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function isFormTarget(e: KeyboardEvent): boolean {
    return (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    );
  }

  function setKey(code: string, pressed: boolean) {
    if (code === "ArrowLeft" || code === "KeyA") keys.left = pressed;
    else if (code === "ArrowRight" || code === "KeyD") keys.right = pressed;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();

    if (PAUSE_KEYS.includes(e.code)) {
      if (e.repeat) return;
      if (phase === "paused") resume();
      else pause();
      return;
    }
    if (phase === "paused" || phase === "gameover") return;

    if (e.code === "Space") {
      if (!e.repeat) handleAction();
      return;
    }
    setKey(e.code, true);
  }

  // Evita que Space active el botón con foco al soltarse.
  function onKeyUp(e: KeyboardEvent) {
    if (destroyed || isFormTarget(e)) return;
    if (BLOCKED_KEYS.includes(e.code)) e.preventDefault();
    setKey(e.code, false);
  }

  function onBlur() {
    keys.left = false;
    keys.right = false;
  }

  // Coordenada del ratón escalada a lógica (el canvas se escala por CSS).
  function mouseLogicalX(e: MouseEvent): number {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return paddle.x + paddle.w / 2;
    return (e.clientX - rect.left) * (CANVAS_W / rect.width);
  }

  function onMouseMove(e: MouseEvent) {
    if (destroyed || phase === "paused" || phase === "gameover") return;
    paddle.x = clampPaddle(mouseLogicalX(e) - paddle.w / 2);
  }

  function onMouseDown() {
    if (destroyed || phase === "paused" || phase === "gameover") return;
    handleAction();
  }

  // ── Bucle principal ───────────────────────────────────────────────────────
  function loop(now: number) {
    if (destroyed) return;
    let dt = 0;
    if (resetClock) {
      resetClock = false;
    } else {
      dt = Math.min((now - lastTime) / 1000, MAX_DT);
    }
    lastTime = now;
    if (phase !== "paused" && phase !== "gameover") update(dt);
    draw();
    notify();
    rafId = requestAnimationFrame(loop);
  }

  // ── API pública ───────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || !started) return;
    if (phase !== "playing" && phase !== "levelcomplete") return;
    resumePhase = phase;
    phase = "paused";
    keys.left = false;
    keys.right = false;
    notify();
  }

  function resume() {
    if (destroyed || phase !== "paused") return;
    phase = resumePhase;
    resetClock = true; // evita un dt enorme tras la pausa
    notify();
  }

  function restart() {
    if (destroyed || !started) return;
    initGame();
    resetClock = true;
    notify();
  }

  function end() {
    if (destroyed || !started || phase === "gameover") return;
    gameOver();
  }

  function start() {
    if (started || destroyed) return;
    started = true;
    initGame();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    notify();
    // El bucle no arranca hasta que carga el spritesheet.
    cancelLoad = loadSpritesheet(
      (s) => {
        if (destroyed) return;
        sheet = s;
        rafId = requestAnimationFrame((now) => {
          lastTime = now;
          rafId = requestAnimationFrame(loop);
        });
      },
      () => {},
    );
  }

  function setSkin(name: SkinName) {
    skin = SKINS[name] ?? SKINS[DEFAULT_SKIN];
    if (started && !destroyed) draw();
  }

  function destroy() {
    destroyed = true;
    cancelLoad?.();
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mousedown", onMouseDown);
    keys.left = false;
    keys.right = false;
  }

  return { start, pause, resume, restart, end, destroy, setSkin };
}
