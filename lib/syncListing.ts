// Trimiterea unei mașini din stoc pe site-ul lor, într-un singur loc.
//
// Folosit atât de butonul de publicare, cât și de editarea mașinii: dacă
// anunțul e deja pe site, orice modificare în CRM trebuie să ajungă și acolo,
// altfel site-ul rămâne cu datele vechi.

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";
import { engineSizeCm3 } from "@/lib/wpTaxonomy";
import {
  publishListing, buildPostContent, writeListingFields, syncPhotos, setFeaturedImage,
} from "@/lib/wordpress";
import type { InventoryRow } from "@/lib/schema";

export interface SyncResult {
  postId: string;
  url: string;
  mediaId: string | null;
  photoCount: number;
}

/**
 * Trimite mașina pe site. `onCreated` e chemat imediat ce anunțul există acolo,
 * ÎNAINTE de pașii lenți (pozele). Așa id-ul se salvează în CRM chiar dacă
 * restul cade: altfel o reîncercare ar crea un anunț nou de fiecare dată.
 */
export async function syncListingToSite(
  item: InventoryRow,
  onCreated?: (postId: string, url: string) => Promise<void>,
): Promise<SyncResult> {
  const photoRows = await db
    .select({ url: carPhotos.url })
    .from(carPhotos)
    .where(eq(carPhotos.inventoryId, item.id))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));
  const urls = photoRows.map((p) => p.url);

  const title = item.listingTitle?.trim() || `${item.brand} ${item.model} ${item.year}`;

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

  // Id-ul se reține acum, cât timp nu s-a întâmplat nimic lent. Dacă pasul cu
  // pozele expiră, următoarea încercare actualizează același anunț.
  if (onCreated) {
    try {
      await onCreated(result.postId, result.url);
    } catch (e) {
      console.error("[wordpress:onCreated]", e);
    }
  }

  // Pozele se leagă de anunț, deci se urcă după ce anunțul există.
  const slug = `${item.brand}-${item.model}-${item.year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let photos: Awaited<ReturnType<typeof syncPhotos>> = [];
  try {
    photos = await syncPhotos(result.postId, urls, slug);
  } catch (e) {
    console.error("[wordpress:photos]", e);
  }

  // Specificațiile, textul și galeria merg în câmpurile temei: tema nu citește
  // din taxonomii când afișează pagina anunțului.
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

  if (photos[0]) {
    try {
      await setFeaturedImage(result.postId, String(photos[0].id));
    } catch (e) {
      console.error("[wordpress:thumb]", e);
    }
  }

  return {
    postId: result.postId,
    url: result.url,
    mediaId: photos[0] ? String(photos[0].id) : item.wpMediaId,
    photoCount: photos.length,
  };
}

/**
 * Retrimite pe site mașina cu acest id, dar numai dacă anunțul există deja
 * acolo. Folosit după adăugarea sau ștergerea unei poze: altfel galeria de pe
 * site ar rămâne cea veche. Nu aruncă niciodată — salvarea în CRM e deja făcută.
 */
export async function resyncIfPublished(inventoryId: string): Promise<void> {
  try {
    const { wordpressConfigured } = await import("@/lib/wordpress");
    if (!wordpressConfigured()) return;
    const [item] = await db
      .select().from(inventory)
      .where(eq(inventory.id, inventoryId)).limit(1);
    if (!item || item.isDeleted || !item.wpPostId || !item.publishedSite) return;
    if (item.status === "sold") return;
    const res = await syncListingToSite(item);

    if (res.mediaId !== item.wpMediaId) {
      await db.update(inventory).set({ wpMediaId: res.mediaId }).where(eq(inventory.id, inventoryId));
    }
  } catch (e) {
    console.error("[wordpress:resync]", e);
  }
}
