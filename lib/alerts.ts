import { and, eq, lt, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos, leads } from "@/lib/schema";

export interface Alert {
  key: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  count: number;
  link: string;
}

const STOCK_STALE_DAYS = 60;

// Calculează alertele acționabile din tot sistemul.
export async function computeAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = Date.now();

  // 1. Mașini în stoc de prea mult timp (> STOCK_STALE_DAYS zile).
  const staleDate = new Date(now - STOCK_STALE_DAYS * 86400000);
  const [{ n: stale }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(inventory)
    .where(and(eq(inventory.isDeleted, false), eq(inventory.status, "available"), lt(inventory.createdAt, staleDate)));
  if (stale > 0) {
    alerts.push({
      key: "stock_stale", severity: "medium",
      title: `${stale} ${stale === 1 ? "mașină stă" : "mașini stau"} în stoc de peste ${STOCK_STALE_DAYS} zile`,
      detail: "Reduceri de preț sau promovare suplimentară?", count: stale, link: "/dashboard/inventory",
    });
  }

  // 2. Mașini disponibile fără nicio poză (nu pot fi publicate).
  const avail = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(and(eq(inventory.isDeleted, false), eq(inventory.status, "available")));
  if (avail.length) {
    const ids = avail.map((r) => r.id);
    const withPhotos = await db
      .selectDistinct({ id: carPhotos.inventoryId })
      .from(carPhotos)
      .where(inArray(carPhotos.inventoryId, ids));
    const withSet = new Set(withPhotos.map((r) => r.id));
    const noPhoto = ids.filter((id) => !withSet.has(id)).length;
    if (noPhoto > 0) {
      alerts.push({
        key: "no_photos", severity: "medium",
        title: `${noPhoto} ${noPhoto === 1 ? "mașină fără poze" : "mașini fără poze"}`,
        detail: "Nu pot fi publicate pe site/999.md fără fotografii.", count: noPhoto, link: "/dashboard/inventory",
      });
    }
  }

  // 4. Lead-uri noi necontactate de peste 24h.
  const dayAgo = new Date(now - 86400000);
  const [{ n: coldLeads }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(eq(leads.isDeleted, false), eq(leads.status, "new"), lt(leads.createdAt, dayAgo)));
  if (coldLeads > 0) {
    alerts.push({
      key: "cold_leads", severity: "high",
      title: `${coldLeads} lead-uri noi necontactate`,
      detail: "Clienți care așteaptă răspuns de peste 24 de ore.", count: coldLeads, link: "/dashboard/leads",
    });
  }

  return alerts;
}
