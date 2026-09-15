import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { inventoryToDTO } from "@/lib/serialize";

// PUT /api/inventory/[id] — ADMIN ONLY. Editare mașină din stoc.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  const [item] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!item || item.isDeleted) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  const editable = ["brand", "model", "year", "vin", "color", "ownerName", "ownerPhone", "clientWantPrice", "sellPrice", "status", "notes", "published", "listingTitle", "listingDescription"];
  const changes: Record<string, unknown> = {};
  const updates: Record<string, unknown> = {};
  for (const field of editable) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (field === "year") value = Number(value);
    if (field === "clientWantPrice" || field === "sellPrice") value = Number(value);
    if (field === "published") value = Boolean(value);
    updates[field] = value;
    changes[field] = value;
  }

  const [saved] = Object.keys(updates).length
    ? await db.update(inventory).set(updates).where(eq(inventory.id, params.id)).returning()
    : [item];

  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_STOCK",
    details: { stockId: params.id, changes },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ item: inventoryToDTO(saved) });
}

// DELETE /api/inventory/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  const [item] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!item || item.isDeleted) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  await db
    .update(inventory)
    .set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
    .where(eq(inventory.id, params.id));

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_STOCK",
    details: { stockId: params.id, brand: item.brand, model: item.model },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
