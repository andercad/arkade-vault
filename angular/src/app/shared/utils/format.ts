/** Puntuación con separador de miles en es-ES (fijo para evitar *hydration mismatch*). */
export function formatScore(n: number): string {
  return n.toLocaleString('es-ES');
}
