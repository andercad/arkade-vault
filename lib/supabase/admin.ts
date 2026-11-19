import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente con service_role: solo servidor. Nunca importar desde componentes cliente.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.");
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
