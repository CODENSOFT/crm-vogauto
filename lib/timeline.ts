import { and, eq, or, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, inventory, imports } from "@/lib/schema";
import { IMPORT_STAGE_LABELS, type ImportStage } from "@/types";

export interface TimelineEvent {
  date: string | null;
  kind: "import" | "stock" | "work" | "publish" | "sale";
  title: string;
  detail?: string;
}

// Reconstituie ciclul de viață al unei mașini, legând tabelele după VIN.
export async function computeTimeline(opts: { vin?: string | null; carId?: string; inventoryId?: string }): Promise<TimelineEvent[]> {
  const { vin } = opts;
  const events: TimelineEvent[] = [];

  // Import (după VIN).
  if (vin) {
    const imps = await db.select().from(imports).where(and(eq(imports.isDeleted, false), eq(imports.vin, vin)));
    for (const im of imps) {
      events.push({ date: new Date(im.createdAt).toISOString(), kind: "import", title: "Adăugată la import", detail: `${im.brand} ${im.model}${im.source ? ` · ${im.source}` : ""}` });
      if (im.arrivedDate) events.push({ date: new Date(im.arrivedDate).toISOString(), kind: "import", title: "Sosită din import", detail: IMPORT_STAGE_LABELS[im.stage as ImportStage] });
    }
  }

  // Stoc (după id, după vânzarea legată — saleId — sau după VIN).
  const invOr = [];
  if (opts.inventoryId) invOr.push(eq(inventory.id, opts.inventoryId));
  if (opts.carId) invOr.push(eq(inventory.saleId, opts.carId));
  if (vin) invOr.push(eq(inventory.vin, vin));
  const invs = invOr.length
    ? await db.select().from(inventory).where(and(eq(inventory.isDeleted, false), invOr.length === 1 ? invOr[0] : or(...invOr)!))
    : [];
  const invIds = invs.map((i) => i.id);
  for (const inv of invs) {
    events.push({ date: new Date(inv.createdAt).toISOString(), kind: "stock", title: "Adăugată în stoc", detail: `${inv.brand} ${inv.model} ${inv.year}` });
    if (inv.publishedSite) events.push({ date: new Date(inv.createdAt).toISOString(), kind: "publish", title: "Publicată pe site" });
    if (inv.published999) events.push({ date: new Date(inv.createdAt).toISOString(), kind: "publish", title: "Publicată pe 999.md" });
  }

  // Vânzare.
  const sale = opts.carId
    ? await db.select().from(cars).where(and(eq(cars.id, opts.carId), eq(cars.isDeleted, false))).limit(1)
    : vin ? await db.select().from(cars).where(and(eq(cars.vin, vin), eq(cars.isDeleted, false))).limit(1) : [];
  for (const c of sale) {
    events.push({ date: new Date(c.saleDate).toISOString(), kind: "sale", title: "Vândută", detail: c.soldByName ? `de ${c.soldByName}` : undefined });
  }

  // Ordonează cronologic (evenimentele fără dată la final).
  events.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  return events;
}
