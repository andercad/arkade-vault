# Juego de Arkanoid

Juego de Arkanoid hecho con HTML, CSS y JavaScript puros: **cero dependencias**, sin compilación ni gestor de paquetes. Desarrollado con una metodología **spec-driven**: cada funcionalidad se define primero en una spec (`specs/`) y después se implementa paso a paso.

## Cómo jugar

Abre `index.html` directamente en el navegador. No hace falta servidor ni instalación.

### Controles

| Acción | Control |
| --- | --- |
| Mover la pala | Ratón, flechas `←` `→` o teclas `A` `D` |
| Lanzar la bola / empezar / pasar de nivel / reiniciar | `Espacio` o clic |
| Pausar / reanudar | `P` o `Esc` |
| Saltar a un nivel (solo en pausa) | Teclas `1`–`5` o clic en el número |

## Características

- Pala, bola, bloques de colores (un color por fila), 3 vidas y puntuación (10 puntos por bloque).
- Pantallas de inicio, pausa, nivel completado, game over y victoria.
- Récord persistente en `localStorage`.
- Cinco niveles con patrones distintos (rejilla, pirámide, damero, columnas alternas y diamante). La bola acelera un 8 % en cada nivel.
- Explosión de sprites y partículas al romper bloques.
- Sonidos de rebote y de rotura de bloques.
- Selector de nivel en la pantalla de pausa.

## Estructura del proyecto

```
index.html                    página del juego (canvas 480x640)
style.css                     estilos
game.js                       lógica del juego
levels.js                     patrones de los cinco niveles
assets/spritesheet.js         carga y dibujado de sprites
assets/spritesheet-breakout.png
assets/sounds/                ball-bounce.mp3, break-sound.mp3
specs/                        especificaciones de cada funcionalidad
.agents/skills/               skills /spec y /spec-impl
```

## Desarrollo spec-driven

Las funcionalidades se construyen con dos skills de Claude Code:

- `/spec <descripción>`: genera `specs/NN-slug.md` en estado Borrador, sin escribir código.
- `/spec-impl NN-slug`: implementa una spec aprobada, un paso del plan cada vez, en la rama `spec-NN-slug`. Nunca hace commit automáticamente.

### Specs

| Spec | Contenido |
| --- | --- |
| `01-arkanoid-mvp` | MVP jugable: pala, bola, bloques, vidas, puntuación, pausa y récord |
| `02-particulas-destruccion-bloques` | Partículas al destruir bloques |
| `03-sonidos` | Sonidos de rebote y rotura |
| `04-cinco-niveles` | Cinco niveles, velocidad creciente y selector de nivel en pausa |
