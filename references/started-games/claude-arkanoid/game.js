// Constantes
const CANVAS_W = 480;
const CANVAS_H = 640;
const MAX_DT = 1 / 30; // límite de delta time por frame (s)
const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_W = 48; // 480 / 10 (sprite 32x16 escalado x1.5)
const BRICK_H = 24;
const BRICK_TOP = 80; // margen superior para el HUD
const BRICK_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green']; // de arriba a abajo
const BRICK_POINTS = 10;
const INITIAL_LIVES = 3;
const LEVEL_COUNT = 5;
const LEVEL_SPEED_STEP = 0.08; // +8 % de BALL_SPEED por nivel
// Los patrones (LEVELS) están en levels.js, cargado antes que este archivo
const HIGHSCORE_KEY = 'arkanoid:v1:highScore';
const PADDLE_W = 96;
const PADDLE_H = 14;
const PADDLE_SPEED = 420; // px/s (teclado)
const BALL_SIZE = 14;
const BALL_SPEED = 360; // px/s, constante
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° respecto a la vertical
const PARTICLE_COUNT = 8; // partículas por bloque roto
const PARTICLE_SIZE = 4; // lado del cuadrado en px
const PARTICLE_LIFE = 400; // ms de vida
const PARTICLE_SPEED_MIN = 60; // px/s
const PARTICLE_SPEED_MAX = 180; // px/s
const PARTICLE_GRAVITY = 900; // px/s², hacia abajo
const PARTICLE_COLORS = {
  // hex aproximado al color de cada fila de BRICK_COLORS
  red: '#e53935',
  yellow: '#fdd835',
  cyan: '#26c6da',
  magenta: '#ab47bc',
  hotpink: '#ff4081',
  green: '#43a047',
};
const SOUND_BOUNCE_SRC = 'assets/sounds/ball-bounce.mp3';
const SOUND_BREAK_SRC = 'assets/sounds/break-sound.mp3';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Audios base (se clonan al reproducir para poder solaparse)
const sounds = {
  bounce: new Audio(SOUND_BOUNCE_SRC),
  brk: new Audio(SOUND_BREAK_SRC),
};

function playSound(audio) {
  // catch: el navegador puede bloquear la reproducción (autoplay)
  audio.cloneNode().play().catch(() => {});
}

// Estado del juego (se irá ampliando en pasos posteriores)
const game = {
  state: 'start', // 'start' | 'playing' | 'paused' | 'levelcomplete' | 'gameover' | 'won'
  score: 0,
  highScore: 0, // leído de localStorage al cargar
  lives: INITIAL_LIVES,
  level: 1, // 1..LEVEL_COUNT
  paddle: { x: (CANVAS_W - PADDLE_W) / 2, y: 600, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0, size: BALL_SIZE, stuck: true },
  bricks: [], // { x, y, w, h, color, alive }
  explosions: [], // { x, y, w, h, color, start } (start en ms)
  particles: [], // { x, y, vx, vy, color, age } (age en ms, acumulado con dt)
};

// Récord: localStorage con respaldo en memoria si falla
function loadHighScore() {
  try {
    const value = parseInt(localStorage.getItem(HIGHSCORE_KEY), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (e) {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(value));
  } catch (e) {
    // Sin localStorage: el récord solo vive en memoria
  }
}

// Al terminar la partida (game over o victoria): guarda el récord si se supera
function endGame(state) {
  game.state = state;
  if (game.score > game.highScore) {
    game.highScore = game.score;
    saveHighScore(game.highScore);
  }
}

game.highScore = loadHighScore();

// Genera los bloques del nivel a partir de su patrón (un color por fila)
function createBricks(level) {
  const pattern = LEVELS[level - 1];
  const bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (pattern[row][col] !== 'X') continue;
      bricks.push({
        x: col * BRICK_W,
        y: BRICK_TOP + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        color: BRICK_COLORS[row],
        alive: true,
      });
    }
  }
  return bricks;
}

game.bricks = createBricks(game.level);

// Pega la bola al centro de la pala
function stickBall() {
  const { paddle, ball } = game;
  ball.stuck = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = paddle.x + (paddle.w - ball.size) / 2;
  ball.y = paddle.y - ball.size;
}

stickBall();

// Velocidad de la bola del nivel (px/s): +8 % de la base por nivel, constante dentro del nivel
function ballSpeed(level) {
  return BALL_SPEED * (1 + LEVEL_SPEED_STEP * (level - 1));
}

// Lanza la bola hacia arriba
function launchBall() {
  game.ball.stuck = false;
  game.ball.vx = 0;
  game.ball.vy = -ballSpeed(game.level);
}

// Genera las partículas de un bloque roto: nacen en su centro, con dirección y velocidad aleatorias
function spawnParticles(brick) {
  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
    game.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PARTICLE_COLORS[brick.color],
      age: 0,
    });
  }
}

// Prepara un nivel: bloques del patrón, sin efectos previos, pala centrada y bola pegada
function startLevel(level) {
  game.level = level;
  game.bricks = createBricks(level);
  game.explosions = [];
  game.particles = [];
  game.paddle.x = (CANVAS_W - PADDLE_W) / 2;
  stickBall();
  game.state = 'playing';
}

// Empieza una partida nueva: 3 vidas, 0 puntos, nivel 1
function startGame() {
  game.score = 0;
  game.lives = INITIAL_LIVES;
  startLevel(1);
}

// Acción de Espacio / clic según el estado
function handleAction() {
  if (game.state === 'start' || game.state === 'gameover' || game.state === 'won') {
    startGame();
  } else if (game.state === 'levelcomplete') {
    startLevel(game.level + 1);
  } else if (game.state === 'playing' && game.ball.stuck) {
    launchBall();
  }
}

// Pausa: solo desde 'playing'; la misma tecla reanuda
function togglePause() {
  if (game.state === 'playing') {
    game.state = 'paused';
  } else if (game.state === 'paused') {
    game.state = 'playing';
  }
}

// Selector de nivel de la pausa: botones "1".."5" centrados en una fila
const LEVEL_BTN_SIZE = 36;
const LEVEL_BTN_GAP = 12;
const LEVEL_BTN_Y = 380;

function levelButtonRect(n) {
  const totalW = LEVEL_COUNT * LEVEL_BTN_SIZE + (LEVEL_COUNT - 1) * LEVEL_BTN_GAP;
  const x = (CANVAS_W - totalW) / 2 + (n - 1) * (LEVEL_BTN_SIZE + LEVEL_BTN_GAP);
  return { x, y: LEVEL_BTN_Y, w: LEVEL_BTN_SIZE, h: LEVEL_BTN_SIZE };
}

// Clic en la pausa: si cae sobre un botón de nivel, salta a ese nivel
function handleCanvasClick(e) {
  if (game.state !== 'paused') {
    handleAction();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left - canvas.clientLeft;
  const my = e.clientY - rect.top - canvas.clientTop;
  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const r = levelButtonRect(n);
    if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
      startLevel(n);
      return;
    }
  }
}

let lastTime = 0;

// Entrada
const keys = { left: false, right: false };

function setKey(e, pressed) {
  switch (e.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = pressed;
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = pressed;
      e.preventDefault();
      break;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) handleAction();
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    if (!e.repeat) togglePause();
    return;
  }
  // Teclas 1..5: solo en pausa, saltan a ese nivel
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (digit) {
    const n = Number(digit[1]);
    if (game.state === 'paused' && n <= LEVEL_COUNT && !e.repeat) {
      e.preventDefault();
      startLevel(n);
    }
    return;
  }
  setKey(e, true);
});
canvas.addEventListener('mousedown', handleCanvasClick);
window.addEventListener('keyup', (e) => setKey(e, false));

// La pala sigue al cursor en X (centrada en el cursor)
canvas.addEventListener('mousemove', (e) => {
  if (game.state === 'paused') return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left - canvas.clientLeft;
  game.paddle.x = clampPaddle(mouseX - game.paddle.w / 2);
});

function clampPaddle(x) {
  return Math.max(0, Math.min(CANVAS_W - game.paddle.w, x));
}

function update(dt) {
  if (game.state === 'paused') return; // todo congelado

  // Descarta explosiones terminadas
  const nowMs = performance.now();
  game.explosions = game.explosions.filter((ex) => nowMs - ex.start < EXPLOSION_DURATION);

  // Partículas: mover, gravedad, envejecer con dt y descartar las que superen su vida
  for (const p of game.particles) {
    p.vy += PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.age += dt * 1000;
  }
  game.particles = game.particles.filter((p) => p.age < PARTICLE_LIFE);

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir !== 0) {
    game.paddle.x = clampPaddle(game.paddle.x + dir * PADDLE_SPEED * dt);
  }

  const { paddle, ball } = game;
  if (ball.stuck) {
    // Antes del lanzamiento la bola sigue a la pala
    ball.x = paddle.x + (paddle.w - ball.size) / 2;
    ball.y = paddle.y - ball.size;
  } else if (game.state === 'playing') {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    let bounced = false; // máximo un sonido de rebote por frame

    // Rebote en paredes laterales
    if (ball.x < 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      bounced = true;
    } else if (ball.x + ball.size > CANVAS_W) {
      ball.x = CANVAS_W - ball.size;
      ball.vx = -Math.abs(ball.vx);
      bounced = true;
    }

    // Rebote en el techo
    if (ball.y < 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      bounced = true;
    }
    // Rebote en la pala: ángulo según el punto de impacto
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
      const offset = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (paddle.w / 2)));
      const angle = offset * MAX_BOUNCE_ANGLE; // respecto a la vertical
      const speed = ballSpeed(game.level);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
      ball.y = paddle.y - ball.size;
      bounced = true;
    }
    if (bounced) playSound(sounds.bounce);

    // Colisión con bloques: rompe uno por frame e invierte solo el eje de menor solape
    for (const b of game.bricks) {
      if (!b.alive) continue;
      if (
        ball.x + ball.size <= b.x ||
        ball.x >= b.x + b.w ||
        ball.y + ball.size <= b.y ||
        ball.y >= b.y + b.h
      ) continue;

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
      game.explosions.push({ x: b.x, y: b.y, w: b.w, h: b.h, color: b.color, start: performance.now() });
      spawnParticles(b);
      playSound(sounds.brk);
      game.score += BRICK_POINTS;
      break;
    }

    // Nivel completado: no quedan bloques (tras el último nivel, victoria)
    if (game.bricks.every((b) => !b.alive)) {
      if (game.level < LEVEL_COUNT) {
        game.state = 'levelcomplete';
      } else {
        endGame('won');
      }
      return;
    }

    // Bola perdida por abajo: resta una vida
    if (ball.y > CANVAS_H) {
      game.lives--;
      if (game.lives <= 0) {
        endGame('gameover');
      } else {
        stickBall();
      }
    }
  }
}

function drawCenteredText(text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, CANVAS_W / 2, y);
}

function drawCenteredTextAt(text, x, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function render() {
  ctx.fillStyle = '#14142b';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const { paddle, ball } = game;
  for (const b of game.bricks) {
    if (b.alive) drawSprite(ctx, 'block_' + b.color, b.x, b.y, b.w, b.h);
  }
  const renderNow = performance.now();
  for (const ex of game.explosions) {
    const frames = EXPLOSION_FRAMES[ex.color];
    const t = (renderNow - ex.start) / EXPLOSION_DURATION;
    if (t < 0 || t >= 1) continue;
    drawFrame(ctx, frames[Math.floor(t * frames.length)], ex.x, ex.y, ex.w, ex.h);
  }
  // Partículas: cuadrados centrados en (x, y) con alpha decreciente
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / PARTICLE_LIFE);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
  }
  ctx.globalAlpha = 1;
  drawSprite(ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h);
  drawSprite(ctx, 'ball', ball.x, ball.y, ball.size, ball.size);

  // HUD en una línea: puntos, récord, nivel y vidas (derecha)
  ctx.textAlign = 'left';
  ctx.font = '16px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PUNTOS: ' + game.score, 12, 28);
  ctx.fillText('RÉCORD: ' + Math.max(game.highScore, game.score), 150, 28);
  ctx.fillText('NIVEL: ' + game.level, 295, 28);
  // Vidas: una bola por vida restante, alineadas a la derecha
  const lifeSize = BALL_SIZE;
  const lifeGap = 6;
  for (let i = 0; i < game.lives; i++) {
    const lx = CANVAS_W - 12 - lifeSize - i * (lifeSize + lifeGap);
    drawSprite(ctx, 'ball', lx, 28 - lifeSize + 2, lifeSize, lifeSize);
  }

  if (game.state === 'start') {
    ctx.fillStyle = 'rgba(11, 11, 20, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawCenteredText('ARKANOID', 260, 'bold 48px monospace', '#ffffff');
    drawCenteredText('Pulsa Espacio o haz clic para empezar', 320, '16px monospace', '#cccccc');
  } else if (game.state === 'paused') {
    ctx.fillStyle = 'rgba(11, 11, 20, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawCenteredText('PAUSA', 290, 'bold 44px monospace', '#ffffff');
    drawCenteredText('Pulsa P o Esc para continuar', 330, '16px monospace', '#cccccc');
    // Selector de nivel: nivel actual resaltado
    drawCenteredText('Elegir nivel (1-5)', 365, '14px monospace', '#cccccc');
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const r = levelButtonRect(n);
      const current = n === game.level;
      ctx.fillStyle = current ? '#ffd835' : 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = current ? '#ffffff' : '#666688';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      drawCenteredTextAt(String(n), r.x + r.w / 2, r.y + r.h / 2 + 7, 'bold 20px monospace', current ? '#14142b' : '#ffffff');
    }
  } else if (game.state === 'levelcomplete') {
    ctx.fillStyle = 'rgba(11, 11, 20, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawCenteredText('NIVEL ' + game.level + ' COMPLETADO', 280, 'bold 36px monospace', '#7CFC00');
    drawCenteredText('Espacio o clic para continuar', 330, '16px monospace', '#cccccc');
  } else if (game.state === 'gameover' || game.state === 'won') {
    ctx.fillStyle = 'rgba(11, 11, 20, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const won = game.state === 'won';
    drawCenteredText(won ? '¡VICTORIA!' : 'GAME OVER', 260, 'bold 44px monospace', won ? '#7CFC00' : '#ff5555');
    drawCenteredText('Puntuación final: ' + game.score, 310, '18px monospace', '#ffffff');
    drawCenteredText('Espacio o clic para reiniciar', 350, '16px monospace', '#cccccc');
  } else if (game.state === 'playing' && ball.stuck) {
    drawCenteredText('Espacio o clic para lanzar', 400, '14px monospace', '#cccccc');
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(loop);
  });
});
