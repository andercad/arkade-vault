// Estado de error genérico: nunca muestra el detalle de Supabase.
// Versión mínima del paso 4; el paso 9 lo pule con /frontend-design.
export function DataError({ gridSpan = false }: { gridSpan?: boolean }) {
  return (
    <div
      role="alert"
      style={{
        gridColumn: gridSpan ? "1 / -1" : undefined,
        textAlign: "center",
        padding: 80,
        color: "var(--ink-faint)",
      }}
    >
      <div
        className="pixel"
        style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
      >
        NO SE PUDO CARGAR
      </div>
      <div>Inténtalo de nuevo más tarde.</div>
    </div>
  );
}
