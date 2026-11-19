"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth";

export function ProfileForm() {
  const router = useRouter();
  const { user, loading, signOut, updateUsername } = useAuth();
  // null = sin editar: el campo muestra el username actual.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  // Sin sesión no hay perfil: a /login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <p className="mono" style={{ fontSize: 13 }}>
            Cargando perfil…
          </p>
        </div>
      </div>
    );
  }

  const value = draft ?? user.name;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(false);
    setPending(true);
    const res = await updateUsername(value);
    setPending(false);
    if (!res.ok) return setError(res.error);
    setDraft(null);
    setSaved(true);
  };

  // Hay cambios sin guardar en el campo de usuario.
  const dirty = value.trim().toUpperCase() !== user.name;

  // Sale sin guardar: vuelve a la página anterior (o a la home si no hay).
  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const logout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size={88} />
          </div>
          <h2 className="neon-cyan" style={{ marginTop: 14 }}>
            {user.name}
          </h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            PERFIL DE JUGADOR
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          {error ? (
            <div className="terminal-error" role="alert">
              {error}
            </div>
          ) : (
            saved && (
              <div className="terminal-notice" role="status">
                Usuario actualizado.
              </div>
            )
          )}
          <div className="field">
            <label>Usuario</label>
            <input
              value={value}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved(false);
              }}
              maxLength={10}
              autoComplete="username"
              disabled={pending}
            />
          </div>
          <button
            className="btn lg"
            type="submit"
            disabled={pending || !dirty}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending ? "GUARDANDO…" : "GUARDAR USUARIO"}
          </button>
        </form>

        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          disabled={pending}
          onClick={leave}
        >
          {dirty ? "SALIR SIN GUARDAR" : "SALIR"}
        </button>
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          disabled={pending}
          onClick={logout}
        >
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  );
}
