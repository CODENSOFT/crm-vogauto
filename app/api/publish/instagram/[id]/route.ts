import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { buildCaption, postToInstagram, instagramConfigured } from "@/lib/instagram";

// POST /api/publish/instagram/[id] — pregătește (și, dacă e configurat, publică)
// un anunț Instagram pentru o mașină din stoc. [id] = inventoryId. ADMIN ONLY.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  const [item] = await db.select().from(inventory).where(and(eq(inventory.id, params.id), eq(inventory.isDeleted, false))).limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const photos = await db
    .select()
    .from(carPhotos)
    .where(eq(carPhotos.inventoryId, params.id))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));

  if (photos.length === 0) {
    return NextResponse.json({ error: "Adăugați cel puțin o poză înainte de publicare." }, { status: 400 });
  }

  const caption = buildCaption({
    brand: item.brand, model: item.model, year: item.year,
    price: Number(item.sellPrice), description: item.listingDescription || undefined, color: item.color,
  });
  const imageUrl = photos[0].url;

  // Fără token → întoarcem pachetul pregătit pentru postare manuală.
  if (!instagramConfigured()) {
    return NextResponse.json({
      posted: false,
      prepared: true,
      caption,
      imageUrl,
      photos: photos.map((p) => p.url),
      note: "Instagram nu este configurat (IG_ACCESS_TOKEN / IG_USER_ID). Copiați textul și postați manual.",
    });
  }

  try {
    const mediaId = await postToInstagram(imageUrl, caption);
    await logAction({
      userId: user.id, userName: user.fullName, action: "PUBLISH_INSTAGRAM",
      details: { inventoryId: params.id, mediaId }, request, coords: coordsOf(user),
    });
    return NextResponse.json({ posted: true, mediaId, caption });
  } catch (e) {
    console.error("[instagram]", e);
    return NextResponse.json({ error: "Publicarea pe Instagram a eșuat.", caption, imageUrl }, { status: 502 });
  }
}
