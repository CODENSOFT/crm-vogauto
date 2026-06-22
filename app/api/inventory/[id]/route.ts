import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// PUT /api/inventory/[id] — ADMIN ONLY. Editare mașină din stoc.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  await connectDB();
  const item = await Inventory.findById(params.id);
  if (!item || item.isDeleted) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  const editable = ["brand", "model", "year", "vin", "color", "ownerName", "ownerPhone", "clientWantPrice", "sellPrice", "status", "notes"];
  const changes: Record<string, unknown> = {};
  for (const field of editable) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (field === "year") value = Number(value);
    if (field === "clientWantPrice" || field === "sellPrice") value = Number(value);
    (item as unknown as Record<string, unknown>)[field] = value;
    changes[field] = value;
  }

  await item.save();

  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_STOCK",
    details: { stockId: params.id, changes },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({
    item: { ...item.toObject(), _id: String(item._id), markup: Number(item.sellPrice) - Number(item.clientWantPrice) },
  });
}

// DELETE /api/inventory/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await connectDB();
  const item = await Inventory.findById(params.id);
  if (!item || item.isDeleted) {
    return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  }

  item.isDeleted = true;
  item.deletedAt = new Date();
  item.deletedBy = user.id as unknown as typeof item.deletedBy;
  await item.save();

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_STOCK",
    details: { stockId: params.id, brand: item.brand, model: item.model },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
