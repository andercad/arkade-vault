"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { signIn, signUp } from "@/app/login/actions";
import { validateSignIn, validateSignUp } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";
import { ForgotPassword } from "@/components/forgot-password";

export function AuthForm({
  initialError = null,
  initialNotice = null,
}: {
  initialError?: string | null;
  initialNotice?: string | null;
}) {
  const router = useRouter();
  const { user: session, loading } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  // Con sesión iniciada, /login no tiene sentido: a la home.
  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  const switchTab = (next: "in" | "up") => {
    setTab(next);
    setError(null);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const invalid =
      tab === "in"
        ? validateSignIn({ identifier: user.trim(), password: pass })
        : validateSignUp({
            username: user.trim(),
            email: email.trim(),
            password: pass,
          });
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    try {
      const fd = new FormData();
      fd.set("password", pass);
      if (tab === "in") {
        fd.set("identifier", user.trim());
        const res = await signIn(fd);
        if (!res.ok) return setError(res.error);
        // Navegación completa: el AuthProvider relee la sesión de las cookies
        // (la Server Action las escribió; el cliente no recibe ningún evento).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      } else {
        fd.set("username", user.trim());
        fd.set("email", email.trim());
        const res = await signUp(fd);
        if (!res.ok) return setError(res.error);
        if (res.needsConfirmation) {
          setSentTo(res.email ?? email.trim());
          setPass("");
        } else {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/";
        }
      }
    } catch {
      setError("No se pudo completar la operación. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    if (pending) return;
    setError(null);
    setPending(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Si va bien, el navegador sale hacia el proveedor.
    if (error) {
      setError("No se pudo iniciar el acceso con ese proveedor.");
      setPending(false);
    }
  };

  const guest = () => {
    router.push("/");
  };

  if (forgot) {
    return <ForgotPassword onBack={() => setForgot(false)} />;
  }

  if (sentTo) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">REVISA TU CORREO</h2>
          </div>
          <p className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
            Te hemos enviado un enlace de confirmación a{" "}
            <strong>{sentTo}</strong>. Ábrelo para activar tu cuenta y entrar al
            Vault.
          </p>
          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%", marginTop: 18 }}
            onClick={() => {
              setSentTo(null);
              setTab("in");
            }}
          >
            VOLVER A INICIAR SESIÓN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => switchTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => switchTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {error ? (
            <div className="terminal-error" role="alert">
              {error}
            </div>
          ) : (
            initialNotice && (
              <div className="terminal-notice" role="status">
                {initialNotice}
              </div>
            )
          )}
          <div className="field">
            <label>{tab === "in" ? "Usuario o correo" : "Usuario"}</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder={
                tab === "in" ? "px_kai o jugador@vault.gg" : "px_kai"
              }
              autoComplete="username"
              maxLength={tab === "in" ? 254 : 10}
              disabled={pending}
            />
          </div>
          {tab === "up" && (
            <div className="field slide-in">
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
          )}
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
              disabled={pending}
            />
          </div>

          {tab === "in" && (
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 4, fontSize: 11 }}
              disabled={pending}
              onClick={() => {
                setError(null);
                setForgot(true);
              }}
            >
              ¿OLVIDASTE TU CONTRASEÑA?
            </button>
          )}

          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending
              ? "PROCESANDO…"
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR CUENTA"}
          </button>
        </form>

        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={guest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            disabled={pending}
            onClick={() => oauth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={pending}
            onClick={() => oauth("github")}
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
