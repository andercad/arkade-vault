// Formato de puntuaciones: funciones puras, sin dependencias de Next.
// Las usan lib/scores.server.ts (Next) y el BFF de Angular.

// dd/mm/aaaa en es-ES con zona UTC fija para evitar hydration mismatch.
export function formatScoreDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Tiempo relativo calculado en servidor (evita hydration mismatch).
export function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
