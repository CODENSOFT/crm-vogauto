import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { maskPhone } from "@/lib/utils";

// PUT /api/cars/[id] — ADMIN ONLY. Editare vânzare.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  await connectDB();

  const old = await Car.findById(params.id);
  if (!old || old.isDeleted) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  const editable = [
    "clientName", "clientPhone", "brand", "model", "year", "vin", "color",
    "priceBuy", "priceSell", "paymentMethod", "status", "saleDate", "notes",
  ];
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of editable) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (field === "year") value = Number(value);
    if (field === "priceBuy" || field === "priceSell") value = Number(value);
    if (field === "saleDate") value = new Date(value);

    const oldVal = (old as unknown as Record<string, unknown>)[field];
    const same =
      field === "saleDate"
        ? new Date(oldVal as Date).getTime() === (value as Date).getTime()
        : oldVal === value;
    if (same) continue;

    const logOld = field === "clientPhone" ? maskPhone(oldVal as string) : oldVal;
    const logNew = field === "clientPhone" ? maskPhone(value as string) : value;
    changes[field] = { old: logOld, new: logNew };
    (old as unknown as Record<string, unknown>)[field] = value;
  }

  // Editarea directă a profitului → recalculează prețul de cumpărare.
  if (body.profit !== undefined) {
    const sell = changes.priceSell ? Number(changes.priceSell.new) : Number(old.priceSell);
    const newBuy = sell - Number(body.profit);
    if (newBuy !== Number(old.priceBuy)) {
      changes.priceBuy = { old: old.priceBuy, new: newBuy };
      old.priceBuy = newBuy;
    }
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ message: "Nicio modificare." });
  }

  try {
    await old.save();
  } catch (err: unknown) {
    const e = err as { code?: number };
    const msg = e.code === 11000 ? "VIN deja existent." : "Eroare la salvare.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await logAction({
    userId: user.id,
    userName: user.fullName,
    action: "EDIT_SALE",
    details: { carId: params.id, vin: old.vin, changes },
    request,
    coords: coordsOf(user),
  });

  const obj = old.toObject();
  return NextResponse.json({
    car: { ...obj, _id: String(obj._id), soldBy: String(obj.soldBy), clientPhone: maskPhone(obj.clientPhone) },
  });
}

// DELETE /api/cars/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await connectDB();
  const car = await Car.findById(params.id);
  if (!car || car.isDeleted) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  car.isDeleted = true;
  car.deletedAt = new Date();
  car.deletedBy = user.id as unknown as typeof car.deletedBy;
  await car.save();

  await logAction({
    userId: user.id,
    userName: user.fullName,
    action: "DELETE_SALE",
    details: { carId: params.id, vin: car.vin, client: car.clientName },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
