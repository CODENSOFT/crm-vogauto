import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { wordpressConfigured } from "@/lib/wordpress";
import { autoPublish } from "@/lib/syncListing";

// Publicarea urcă pozele, deci poate dura.
export const maxDuration = 300;

// POST /api/publish/site-sync/[id] — o singură sincronizare cu site-ul, cerută
// după ce s-a terminat de încărcat un set de poze. ADMIN ONLY.
//
// Ruta nu publică nimic de la sine dacă mașina nu e gata: `autoPublish` sare
// peste mașinile în pregătire, peste cele fără poze și peste cele vândute.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  if (!wordpressConfigured()) return NextResponse.json({ ok: false, reason: "neconfigurat" });

  await autoPublish(params.id);
  return NextResponse.json({ ok: true });
}
