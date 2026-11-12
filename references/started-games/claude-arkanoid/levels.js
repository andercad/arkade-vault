// Patrones de los niveles (script global; se carga antes que game.js)
// Un patrón por nivel: 6 filas x 10 columnas. 'X' = bloque, '.' = hueco.
// El color de cada bloque lo da su fila (BRICK_COLORS[fila]).
const LEVELS = [
  // 1. Rejilla completa (60 bloques)
  [
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
  ],
  // 2. Pirámide (40 bloques)
  [
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
  ],
  // 3. Damero (30 bloques)
  [
    'X.X.X.X.X.',
    '.X.X.X.X.X',
    'X.X.X.X.X.',
    '.X.X.X.X.X',
    'X.X.X.X.X.',
    '.X.X.X.X.X',
  ],
  // 4. Columnas alternas (30 bloques)
  [
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
    'X.X.X.X.X.',
  ],
  // 5. Diamante (24 bloques)
  [
    '....XX....',
    '...XXXX...',
    '..XXXXXX..',
    '..XXXXXX..',
    '...XXXX...',
    '....XX....',
  ],
];
