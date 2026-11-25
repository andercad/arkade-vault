import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "./database.types";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieMethods(cookieStore: CookieStore) {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(
      cookiesToSet: {
        name: string;
        value: string;
        options?: Parameters<CookieStore["set"]>[2];
      }[],
    ) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Llamado desde un Server Component: no se pueden escribir cookies.
        // Se ignora; proxy.ts refresca la sesión (SPEC 16).
      }
    },
  };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: cookieMethods(cookieStore) },
  );
}

// SPEC 20: IP del jugador solo de cabeceras que fija el proxy de confianza (Vercel).
// Orden: x-vercel-forwarded-for, x-real-ip, ÚLTIMA entrada de x-forwarded-for.
// La primera entrada de x-forwarded-for la controla el cliente (falsificable).
// Sin ninguna → null (no se envía `sb-forwarded-for`).
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",");
  return (
    h.get("x-vercel-forwarded-for")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    forwarded?.[forwarded.length - 1]?.trim() ||
    null
  );
}

// SPEC 17: cliente SOLO para llamadas `auth.*` de Server Actions (signUp/signIn).
// Usa la clave secreta + `sb-forwarded-for` (IP de `clientIp()`, SPEC 20) para que
// el rate limit de Auth cuente la IP del jugador y no la del servidor. La clave
// secreta SALTA RLS: nunca usar este cliente para consultas de datos
// (`.from()`/`.rpc()`); para eso, `createClient`.
export async function createAuthActionClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.");
  }
  const cookieStore = await cookies();
  const ip = await clientIp();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      cookies: cookieMethods(cookieStore),
      global: ip ? { headers: { "sb-forwarded-for": ip } } : undefined,
    },
  );
}
