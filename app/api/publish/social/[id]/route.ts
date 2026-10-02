import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { buildCaption, postToInstagram, instagramConfigured } from "@/lib/instagram";
import { postToFacebook, facebookConfigured } from "@/lib/facebook";

export interface PlatformResult {
  platform: "facebook" | "instagram";
  posted: boolean;
  id?: string;
  error?: string;
  /** Neconfigurat: textul și pozele se postează manual. */
  manual?: boolean;
}

// POST /api/publish/social/[id] — pregătește și publică anunțul pe Facebook ȘI
// Instagram, într-o singură operație. [id] = inventoryId. ADMIN ONLY.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  const [item] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, params.id), eq(inventory.isDeleted, false)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const photos = await db
    .select({ url: carPhotos.url })
    .from(carPhotos)
    .where(eq(carPhotos.inventoryId, params.id))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));
  if (photos.length === 0) {
    return NextResponse.json({ error: "Adăugați cel puțin o poză înainte de publicare." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const caption = typeof body.caption === "string" && body.caption.trim()
    ? body.caption
    : buildCaption({
        brand: item.brand, model: item.model, year: item.year,
        price: Number(item.sellPrice),
        engine: item.engine, fuelType: item.fuelType, bodyType: item.bodyType,
        power: item.power, color: item.color, transmission: item.transmission,
        driveType: item.driveType, seats: item.seats, mileage: item.mileage,
        // Linkul anunțului de pe site, dacă mașina e deja publicată acolo.
        url: item.wpUrl,
      });
  const imageUrls = photos.map((p) => p.url);

  // Pas 1 (previzualizare): doar textul și pozele, ca să poată fi editate.
  if (!body.confirm) {
    return NextResponse.json({
      preview: true,
      caption,
      photos: imageUrls,
      facebook: facebookConfigured(),
      instagram: instagramConfigured(),
    });
  }

  // Pas 2: postăm pe amândouă. Eșecul uneia nu o oprește pe cealaltă.
  const results: PlatformResult[] = [];

  if (!facebookConfigured()) {
    results.push({ platform: "facebook", posted: false, manual: true });
  } else {
    try {
      results.push({ platform: "facebook", posted: true, id: await postToFacebook(imageUrls, caption) });
    } catch (e) {
      console.error("[facebook]", e);
      results.push({ platform: "facebook", posted: false, error: e instanceof Error ? e.message : "Eroare" });
    }
  }

  if (!instagramConfigured()) {
    results.push({ platform: "instagram", posted: false, manual: true });
  } else {
    try {
      results.push({ platform: "instagram", posted: true, id: await postToInstagram(imageUrls, caption) });
    } catch (e) {
      console.error("[instagram]", e);
      results.push({ platform: "instagram", posted: false, error: e instanceof Error ? e.message : "Eroare" });
    }
  }

  const posted = results.filter((r) => r.posted).map((r) => r.platform);
  if (posted.length) {
    await logAction({
      userId: user.id, userName: user.fullName, action: "PUBLISH_SOCIAL",
      details: { inventoryId: params.id, platforms: posted, photos: imageUrls.length },
      request, coords: coordsOf(user),
    });
  }

  return NextResponse.json({ results, caption, photoCount: imageUrls.length });
}
