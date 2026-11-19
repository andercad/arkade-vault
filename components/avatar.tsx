"use client";

import { useState } from "react";

// Paleta neón del navbar; el color se elige de forma estable a partir del username.
const TONES = [
  "cyan",
  "magenta",
  "violet",
  "green",
  "yellow",
  "orange",
] as const;

function toneFor(name: string): (typeof TONES)[number] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

function initialsFor(name: string): string {
  return (name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "?").toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
}) {
  // URL que ya falló: si cambia la foto se vuelve a intentar.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = !!avatarUrl && failedUrl !== avatarUrl;
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.34),
  };

  return (
    <span
      className={`av-avatar tone-${toneFor(name)}`}
      style={style}
      aria-hidden="true"
    >
      {showPhoto ? (
        // <img> a propósito: la foto viene de dominios externos (Google/GitHub)
        // y no hay remotePatterns; si falla se cae a las iniciales.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initialsFor(name)
      )}
    </span>
  );
}
