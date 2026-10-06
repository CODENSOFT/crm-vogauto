import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { inventoryToDTO } from "@/lib/serialize";
import {
  wordpressConfigured, publishListing, unpublishListing,
  uploadFeaturedImage, buildPostContent,
} from "@/lib/wordpress";

// POST /api/publish/wordpress/[id] — publică (sau actualizează) anunțul mașinii
// pe site-ul WordPress. [id] = inventoryId. ADMIN ONLY.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!wordpressConfigured()) {
    return NextResponse.json({ error: "Conexiunea cu WordPress nu este configurată." }, { status: 400 });
  }
  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const [item] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, params.id), eq(inventory.isDeleted, false)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  if (item.status === "sold") {
    return NextResponse.json({ error: "Mașina este vândută — nu poate fi publicată." }, { status: 400 });
  }

  const photos = await db
    .select({ url: carPhotos.url })
    .from(carPhotos)
    .where(eq(carPhotos.inventoryId, params.id))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));
  const urls = photos.map((p) => p.url);

  const title = item.listingTitle?.trim() || `${item.brand} ${item.model} ${item.year}`;

  try {
    // Imaginea reprezentativă se urcă o singură dată, la prima publicare;
    // restul pozelor rămân servite din stocarea noastră.
    let mediaId = item.wpMediaId;
    if (!mediaId && urls[0]) {
      mediaId = await uploadFeaturedImage(urls[0], `${item.brand}-${item.model}-${item.year}`.toLowerCase());
    }

    const result = await publishListing({
      postId: item.wpPostId,
      title,
      content: buildPostContent({
        title,
        description: item.listingDescription ?? "",
        brand: item.brand, model: item.model, year: item.year,
        price: Number(item.sellPrice),
        photos: urls,
        color: item.color, engine: item.engine, vin: item.vin,
        bodyType: item.bodyType, mileage: item.mileage, fuelType: item.fuelType,
        transmission: item.transmission, driveType: item.driveType,
        condition: item.condition, doors: item.doors,
      }),
      featuredMediaId: mediaId,
      // Aceleași specificații merg și în taxonomiile site-ului, ca mașina să
      // apară în filtrele lor (marcă, combustibil, cutie, culoare...).
      specs: {
        brand: item.brand, model: item.model,
        bodyType: item.bodyType, fuelType: item.fuelType,
        transmission: item.transmission, driveType: item.driveType,
        condition: item.condition, doors: item.doors, color: item.color,
      },
    });

    const [saved] = await db
      .update(inventory)
      .set({
        wpPostId: result.postId,
        wpUrl: result.url,
        wpMediaId: mediaId ?? null,
        publishedSite: true,
      })
      .where(eq(inventory.id, params.id))
      .returning();

    await logAction({
      userId: user.id, userName: user.fullName, action: "PUBLISH_SITE",
      details: { stockId: params.id, title, wpPostId: result.postId, url: result.url },
      request, coords: coordsOf(user),
    });

    return NextResponse.json({ item: inventoryToDTO(saved), url: result.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Eroare la publicare.";
    return NextResponse.json({ error: `WordPress: ${msg}` }, { status: 502 });
  }
}

// DELETE /api/publish/wordpress/[id] — scoate anunțul de pe site (rămâne ciornă).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  const [item] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  try {
    if (item.wpPostId && wordpressConfigured()) await unpublishListing(item.wpPostId);
  } catch (e) {
    console.error("[wordpress:unpublish]", e);
  }

  const [saved] = await db
    .update(inventory)
    .set({ publishedSite: false })
    .where(eq(inventory.id, params.id))
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "UNPUBLISH_SITE",
    details: { stockId: params.id, wpPostId: item.wpPostId },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ item: inventoryToDTO(saved) });
}
