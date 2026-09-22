import { NextResponse } from "next/server";
import { and, or, eq, ilike, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, carPhotos, inventoryExpenses } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { escapeLike } from "@/lib/utils";
import { inventoryToDTO } from "@/lib/serialize";

// GET /api/inventory — listă stoc. Orice utilizator autentificat (workerii o
// folosesc pentru a alege o mașină la înregistrarea vânzării).
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim();

  const conds = [eq(inventory.isDeleted, false)];
  if (status === "preparing" || status === "available" || status === "sold") conds.push(eq(inventory.status, status));
  if (search) {
    const safe = `%${escapeLike(search)}%`;
    conds.push(
      or(
        ilike(inventory.brand, safe),
        ilike(inventory.model, safe),
        ilike(inventory.vin, safe),
        ilike(inventory.ownerName, safe)
      )!
    );
  }

  const rows = await db
    .select()
    .from(inventory)
    .where(and(...conds))
    .orderBy(desc(inventory.createdAt));

  const items = rows.map(inventoryToDTO);

  // Atașează foto principală + numărul de poze + totalul cheltuielilor.
  if (items.length) {
    const ids = items.map((i) => i._id);
    const exp = await db
      .select({ inventoryId: inventoryExpenses.inventoryId, total: sql<number>`coalesce(sum(${inventoryExpenses.amount}),0)::float8` })
      .from(inventoryExpenses)
      .where(inArray(inventoryExpenses.inventoryId, ids))
      .groupBy(inventoryExpenses.inventoryId);
    const expMap = new Map(exp.map((e) => [e.inventoryId, Number(e.total)]));
    for (const it of items) it.expensesTotal = expMap.get(it._id) ?? 0;
    const photos = await db
      .select({ inventoryId: carPhotos.inventoryId, url: carPhotos.url })
      .from(carPhotos)
      .where(inArray(carPhotos.inventoryId, ids))
      .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));
    const map = new Map<string, { url: string; count: number }>();
    for (const p of photos) {
      if (!p.inventoryId) continue;
      const e = map.get(p.inventoryId);
      if (e) e.count++;
      else map.set(p.inventoryId, { url: p.url, count: 1 });
    }
    const withPhotos = items.map((it) => {
      const e = map.get(it._id);
      return { ...it, primaryPhoto: e?.url ?? null, photoCount: e?.count ?? 0 };
    });
    return NextResponse.json({ items: withPhotos });
  }

  return NextResponse.json({ items });
}

// POST /api/inventory — ADMIN ONLY. Adaugă o mașină în stoc.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    brand, model, year, vin, color, engine,
    ownerName, ownerPhone, clientWantPrice, purchasePrice, sellPrice, status, notes,
  } = body;

  // Dacă proprietarul e „Parcarea", telefonul și prețul clientului nu sunt cerute.
  const isParcare = String(ownerName || "").trim().toLowerCase() === "parcarea";
  if (!brand || !model || !year || !ownerName || sellPrice === undefined || sellPrice === "" || (!isParcare && !ownerPhone)) {
    return NextResponse.json({ error: "Completați marca, modelul, anul, proprietarul, telefonul și prețul de vânzare." }, { status: 400 });
  }

  const [item] = await db
    .insert(inventory)
    .values({
      brand, model, year: Number(year),
      vin: vin ? String(vin).trim() : null,
      color: color || null,
      engine: engine || null,
      ownerName, ownerPhone: ownerPhone ? String(ownerPhone) : "—",
      clientWantPrice: Number(clientWantPrice) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      sellPrice: Number(sellPrice),
      status: status === "sold" ? "sold" : status === "preparing" ? "preparing" : "available",
      notes: notes || null,
      addedBy: user.id, addedByName: user.fullName,
    })
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_STOCK",
    details: { stockId: item.id, brand, model, vin, sellPrice: Number(sellPrice) },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ item: inventoryToDTO(item) }, { status: 201 });
}
