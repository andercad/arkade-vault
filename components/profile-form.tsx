"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth";
import { changePassword } from "@/app/perfil/actions";

// SPEC 19: cambio de contraseña desplegable (actual + nueva + repetir).
function PasswordSection({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    setError(null);
    setDone(false);
    setPending(true);
    let res;
    try {
      res = await changePassword(new FormData(form));
    } catch {
      res = {
        ok: false as const,
        error: "No se pudo completar la operación. Inténtalo de nuevo.",
      };
    }
    setPending(false);
    if (!res.ok) return setError(res.error);
    form.reset();
    setOpen(false);
    setDone(true);
  };

  return (
    <div style={{ marginTop: 16 }}>
      {done && !open && (
        <div className="terminal-notice" role="status">
          Contraseña actualizada.
        </div>
      )}
      {!open ? (
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%" }}
          disabled={disabled}
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          CAMBIAR CONTRASEÑA
        </button>
      ) : (
        <form onSubmit={submit} noValidate>
          {error && (
            <div className="terminal-error" role="alert">
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="pw-current">Contraseña actual</label>
            <input
              id="pw-current"
              name="current"
              type="password"
              autoComplete="current-password"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="pw-new">Nueva contraseña</label>
            <input
              id="pw-new"
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="pw-repeat">Repetir contraseña</label>
            <input
              id="pw-repeat"
              name="repeat"
              type="password"
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
            {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%", marginTop: 10 }}
            disabled={pending}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            CANCELAR
          </button>
        </form>
      )}
    </div>
  );
}

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

        {user.hasPassword && <PasswordSection disabled={pending} />}

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
