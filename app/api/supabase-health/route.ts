import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TEMPORAL: se elimina en el paso 8 de la spec 04.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("health_check")
      .select("ok")
      .eq("id", 1)
      .single();

    if (error || !data?.ok) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
