import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

const OAUTH_ERROR =
  "No se pudo completar el acceso. Inténtalo de nuevo o entra con tu usuario y contraseña.";
const CONFIRMED_NOTICE =
  "Email confirmado. Ya puedes iniciar sesión con tu cuenta.";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Se lee dentro del Suspense (cacheComponents).
  const { error, confirmed } = await searchParams;
  return (
    <AuthForm
      initialError={error === "oauth" ? OAUTH_ERROR : null}
      initialNotice={confirmed === "1" ? CONFIRMED_NOTICE : null}
    />
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={null}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
