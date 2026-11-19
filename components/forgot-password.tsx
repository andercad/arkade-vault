"use client";

import { useState, type FormEvent } from "react";
import { EMAIL_ERROR, isValidEmail } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

// SPEC 16: pide el enlace de recuperación. Se llama desde el navegador: el
// verificador PKCE queda en sus cookies y /auth/reset-password lo necesita.
export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const value = email.trim();
    if (!isValidEmail(value)) return setError(EMAIL_ERROR);

    setPending(true);
    const { error } = await createClient().auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setPending(false);
    if (error) {
      setError(
        error.code === "over_email_send_rate_limit"
          ? "Demasiados correos enviados. Inténtalo más tarde."
          : "No se pudo enviar el correo. Inténtalo de nuevo.",
      );
      return;
    }
    // Mismo mensaje exista o no la cuenta (no enumerar correos).
    setSent(true);
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">
            {sent ? "REVISA TU CORREO" : "RECUPERAR CONTRASEÑA"}
          </h2>
        </div>

        {sent ? (
          <p className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
            Si <strong>{email.trim()}</strong> tiene una cuenta, recibirás un
            enlace para elegir una nueva contraseña.
          </p>
        ) : (
          <form onSubmit={submit} noValidate>
            {error && (
              <div className="terminal-error" role="alert">
                {error}
              </div>
            )}
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
                autoComplete="email"
                disabled={pending}
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              disabled={pending}
              style={{ width: "100%", marginTop: 8 }}
            >
              {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
            </button>
          </form>
        )}

        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={onBack}
        >
          VOLVER A INICIAR SESIÓN
        </button>
      </div>
    </div>
  );
}
