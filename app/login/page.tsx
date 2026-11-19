import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

const OAUTH_ERROR =
  "No se pudo completar el acceso. Si acabas de confirmar tu email, inicia sesión.";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Se lee dentro del Suspense (cacheComponents).
  const { error } = await searchParams;
  return <AuthForm initialError={error === "oauth" ? OAUTH_ERROR : null} />;
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
