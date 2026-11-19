"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { signIn, signUp } from "@/app/login/actions";
import { validateSignIn, validateSignUp } from "@/lib/auth-validation";

export function AuthForm() {
  const router = useRouter();
  const { user: session, loading } = useAuth();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

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

  const guest = () => {
    router.push("/");
  };

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
          {error && (
            <div className="terminal-error" role="alert">
              {error}
            </div>
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
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
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
