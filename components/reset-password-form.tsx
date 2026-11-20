"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PASSWORD_ERROR, validatePassword } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid";

export function ResetPasswordForm({ code }: { code: string | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(code ? "checking" : "invalid");
  const [pass, setPass] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const started = useRef(false);

  // El código es de un solo uso: el ref evita canjearlo dos veces (StrictMode).
  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;
    createClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => setStatus(error ? "invalid" : "ready"));
  }, [code]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const weak = validatePassword(pass);
    if (weak) return setError(weak);
    if (pass !== repeat) return setError("Las contraseñas no coinciden.");

    setPending(true);
    const { error } = await createClient().auth.updateUser({ password: pass });
    if (error) {
      setPending(false);
      setError(
        error.code === "same_password"
          ? "La nueva contraseña debe ser distinta de la anterior."
          : error.code === "weak_password"
            ? PASSWORD_ERROR
            : "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
      );
      return;
    }
    // La sesión ya está en este navegador (AuthProvider la recibió por evento).
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
        </div>

        {status === "checking" && (
          <p className="mono" style={{ fontSize: 13 }}>
            Comprobando el enlace…
          </p>
        )}

        {status === "invalid" && (
          <>
            <div className="terminal-error" role="alert">
              El enlace no es válido o ha caducado. Pide uno nuevo desde el
              inicio de sesión.
            </div>
            <Link
              href="/login"
              className="btn ghost"
              style={{ width: "100%", textAlign: "center" }}
            >
              IR A INICIAR SESIÓN
            </Link>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={submit} noValidate>
            {error && (
              <div className="terminal-error" role="alert">
                {error}
              </div>
            )}
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={pending}
              />
            </div>
            <div className="field">
              <label>Repite la contraseña</label>
              <input
                type="password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={pending}
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              disabled={pending}
              style={{ width: "100%", marginTop: 8 }}
            >
              {pending ? "GUARDANDO…" : "CAMBIAR CONTRASEÑA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
