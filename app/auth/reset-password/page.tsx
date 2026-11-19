import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

async function ResetContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Se lee dentro del Suspense (cacheComponents).
  const { code } = await searchParams;
  return <ResetPasswordForm code={typeof code === "string" ? code : null} />;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={null}>
      <ResetContent searchParams={searchParams} />
    </Suspense>
  );
}
