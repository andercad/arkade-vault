import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Rutas que exigen sesión (SPEC 17). El resto es público (el invitado puede jugar).
// Ampliar la lista = una línea. Esto es UX/ruta, no frontera de datos: eso es RLS.
const PROTECTED_ROUTES = ["/perfil"];

const isProtected = (pathname: string) =>
  PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

// SPEC 16: refresca la sesión de Supabase en cada petición (cookies).
// SPEC 17: redirige a /login las rutas de PROTECTED_ROUTES si no hay sesión.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida/refresca el token; no insertar código entre createServerClient y esta llamada.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && isProtected(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    // Conserva las cookies que haya fijado el refresco de sesión.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg)$).*)",
  ],
};
