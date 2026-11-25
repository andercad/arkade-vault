import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// SPEC 16: destino de OAuth (Google/GitHub) y del enlace de confirmación de email.
// Canjea el código por sesión y vuelve a la home.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const failure = NextResponse.redirect(`${origin}/login?error=oauth`);

  // Supabase manda ?error=… si el proveedor o el enlace fallan (p. ej. caducado).
  if (!code || searchParams.get("error")) return failure;

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] exchangeCodeForSession:", error.message);
    // Sin verificador PKCE = el enlace se abrió en otro navegador/dispositivo
    // que el del registro. Supabase ya confirmó el email antes de redirigir
    // aquí, así que la cuenta está lista: solo falta iniciar sesión.
    // SPEC 20: por código/nombre de error del SDK (AuthPKCECodeVerifierMissingError,
    // auth-js 2.119), no por el texto del mensaje.
    if (
      error.code === "pkce_code_verifier_not_found" ||
      error.name === "AuthPKCECodeVerifierMissingError"
    ) {
      return NextResponse.redirect(`${origin}/login?confirmed=1`);
    }
    return failure;
  }
  return NextResponse.redirect(`${origin}/`);
}
