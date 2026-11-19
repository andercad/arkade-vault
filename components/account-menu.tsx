"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth";

// Avatar + nombre en un solo bloque; al pulsarlo se abre el menú con Perfil y
// Cerrar sesión (no se ven siempre).
export function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="account" ref={root}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} />
        <span className="account-name">{user.name}</span>
        <span className="account-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <Link href="/perfil" role="menuitem" onClick={() => setOpen(false)}>
            Perfil
          </Link>
          <button
            type="button"
            role="menuitem"
            className="out"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
