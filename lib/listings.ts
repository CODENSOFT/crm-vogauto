import { and, eq, inArray, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos } from "@/lib/schema";

export interface PublicListing {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  vin: string | null;
  price: number;
  title: string;
  description: string;
  photos: string[];
  createdAt: string;
}

// Mașinile publicate pe un canal ("site" | "999") ȘI disponibile (o vânzare
// sau depublicare le scoate automat). NU expune date sensibile.
export async function getPublishedListings(channel: "site" | "999" = "site"): Promise<PublicListing[]> {
  const flag = channel === "999" ? inventory.published999 : inventory.publishedSite;
  const rows = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.isDeleted, false), eq(flag, true), eq(inventory.status, "available")))
    .orderBy(asc(inventory.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const photos = await db
    .select()
    .from(carPhotos)
    .where(inArray(carPhotos.inventoryId, ids))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));

  const byInv = new Map<string, string[]>();
  for (const p of photos) {
    if (!p.inventoryId) continue;
    const list = byInv.get(p.inventoryId) ?? [];
    list.push(p.url);
    byInv.set(p.inventoryId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    brand: r.brand,
    model: r.model,
    year: r.year,
    color: r.color ?? null,
    vin: r.vin ?? null,
    price: Number(r.sellPrice),
    title: r.listingTitle || `${r.brand} ${r.model} ${r.year}`,
    description: r.listingDescription || "",
    photos: byInv.get(r.id) ?? [],
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
