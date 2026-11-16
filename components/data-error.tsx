// Estado de error genérico: nunca muestra el detalle de Supabase.
export function DataError({
  title = "NO SE PUDO CARGAR",
  hint = "Recarga la página en unos segundos.",
  gridSpan = false,
}: {
  title?: string;
  hint?: string;
  gridSpan?: boolean;
}) {
  return (
    <div role="alert" className={"data-error" + (gridSpan ? " span-all" : "")}>
      <p className="de-title">{title}</p>
      <p className="de-hint">{hint}</p>
    </div>
  );
}
