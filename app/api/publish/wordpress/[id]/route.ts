import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { inventoryToDTO } from "@/lib/serialize";
import { engineSizeCm3 } from "@/lib/wpTaxonomy";
import {
  wordpressConfigured, publishListing, unpublishListing,
  buildPostContent, writeListingFields, syncPhotos, setFeaturedImage,
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

      // Aceleași specificații merg și în taxonomiile site-ului, ca mașina să
      // apară în filtrele lor (marcă, combustibil, cutie, culoare...).
      specs: {
        brand: item.brand, model: item.model,
        bodyType: item.bodyType, fuelType: item.fuelType,
        transmission: item.transmission, driveType: item.driveType,
        condition: item.condition, doors: item.doors, color: item.color,
      },
    });

    // Pozele intră în biblioteca lor media, legate de anunț: galeria temei
    // citește atașamentele anunțului, nu adrese din altă parte. Se poate face
    // doar după ce anunțul există, de aceea pasul e aici.
    const slug = `${item.brand}-${item.model}-${item.year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let photos: Awaited<ReturnType<typeof syncPhotos>> = [];
    try {
      photos = await syncPhotos(result.postId, urls, slug);
    } catch (e) {
      console.error("[wordpress:photos]", e);
    }
    const mediaId = photos[0] ? String(photos[0].id) : item.wpMediaId;

    // Specificațiile numerice, textul și galeria merg în câmpurile temei, altfel
    // pagina anunțului le-ar afișa goale (tema nu citește din taxonomii).
    try {
      await writeListingFields(result.postId, {
        price: Number(item.sellPrice),
        year: item.year,
        mileage: item.mileage,
        engineSize: engineSizeCm3(item.engine),
        title,
        description: item.listingDescription ?? "",
        photos,
      }, result.terms);
    } catch (e) {
      // Anunțul e deja creat; semnalăm, dar nu anulăm publicarea.
      console.error("[wordpress:fields]", e);
    }

    // Imaginea reprezentativă, acum că pozele sunt urcate.
    if (photos[0]) {
      try {
        await setFeaturedImage(result.postId, String(photos[0].id));
      } catch (e) {
        console.error("[wordpress:thumb]", e);
      }
    }

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
