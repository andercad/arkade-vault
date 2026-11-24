"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// SPEC 19: aviso tras eliminar la cuenta (`/?cuenta=eliminada`).
export function AccountDeletedNotice() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (params.get("cuenta") !== "eliminada") return;
    const t = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(t);
  }, [params]);

  if (params.get("cuenta") !== "eliminada" || dismissed) return null;

  return (
    <div
      className="terminal-notice"
      role="status"
      style={{ maxWidth: 560, margin: "16px auto 0" }}
    >
      Cuenta eliminada. Tus datos y puntuaciones se han borrado.
      <button
        type="button"
        className="btn ghost"
        style={{ marginLeft: 12 }}
        onClick={() => setDismissed(true)}
      >
        OK
      </button>
    </div>
  );
}
