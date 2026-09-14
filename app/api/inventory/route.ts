import { NextResponse } from "next/server";
import { and, or, eq, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory } from "@/lib/schema";
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
  if (status === "available" || status === "sold") conds.push(eq(inventory.status, status));
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

  return NextResponse.json({ items: rows.map(inventoryToDTO) });
}

// POST /api/inventory — ADMIN ONLY. Adaugă o mașină în stoc.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    brand, model, year, vin, color,
    ownerName, ownerPhone, clientWantPrice, sellPrice, status, notes,
  } = body;

  if (!brand || !model || !year || !ownerName || !ownerPhone || sellPrice === undefined || sellPrice === "") {
    return NextResponse.json({ error: "Completați marca, modelul, anul, proprietarul, telefonul și prețul de vânzare." }, { status: 400 });
  }

  const [item] = await db
    .insert(inventory)
    .values({
      brand, model, year: Number(year),
      vin: vin ? String(vin).trim() : null,
      color: color || null,
      ownerName, ownerPhone,
      clientWantPrice: Number(clientWantPrice) || 0,
      sellPrice: Number(sellPrice),
      status: status === "sold" ? "sold" : "available",
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
