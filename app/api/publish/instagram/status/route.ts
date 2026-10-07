import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { checkInstagram } from "@/lib/instagram";

// GET /api/publish/instagram/status — verifică datele de conectare la
// Instagram. Întoarce și mesajul exact de la Meta: la configurare, „token
// expirat" și „contul nu e Business" cer lucruri complet diferite.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const stare = await checkInstagram();
  // „configured" rămâne pentru interfața existentă.
  return NextResponse.json({ ...stare, configured: stare.ok });
}
