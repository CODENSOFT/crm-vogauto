import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars } from "@/lib/schema";
import { requireAdmin, requireSession, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { maskPhone, isUuid } from "@/lib/utils";
import { carToDTO } from "@/lib/serialize";

// GET /api/cars/[id] — o singură vânzare (pentru pagina de detaliu). Telefon mascat.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  const [car] = await db.select().from(cars).where(eq(cars.id, params.id)).limit(1);
  if (!car || car.isDeleted) return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });

  return NextResponse.json({ car: carToDTO(car, true) });
}

// PUT /api/cars/[id] — ADMIN ONLY. Editare vânzare.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  const [old] = await db.select().from(cars).where(eq(cars.id, params.id)).limit(1);
  if (!old || old.isDeleted) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  const editable = [
    "clientName", "clientPhone", "brand", "model", "year", "vin", "color",
    "priceBuy", "priceSell", "paymentMethod", "status", "saleDate", "notes",
  ];
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const updates: Record<string, unknown> = {};

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
    updates[field] = value;
  }

  // Editarea directă a profitului → recalculează prețul de cumpărare.
  if (body.profit !== undefined) {
    const sell = updates.priceSell !== undefined ? Number(updates.priceSell) : Number(old.priceSell);
    const newBuy = sell - Number(body.profit);
    if (newBuy !== Number(old.priceBuy)) {
      changes.priceBuy = { old: old.priceBuy, new: newBuy };
      updates.priceBuy = newBuy;
    }
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ message: "Nicio modificare." });
  }

  let saved;
  try {
    [saved] = await db.update(cars).set(updates).where(eq(cars.id, params.id)).returning();
  } catch (err: unknown) {
    const e = err as { code?: string };
    const msg = e.code === "23505" ? "VIN deja existent." : "Eroare la salvare.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await logAction({
    userId: user.id,
    userName: user.fullName,
    action: "EDIT_SALE",
    details: { carId: params.id, vin: saved.vin, changes },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ car: carToDTO(saved, true) });
}

// DELETE /api/cars/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  const [car] = await db.select().from(cars).where(eq(cars.id, params.id)).limit(1);
  if (!car || car.isDeleted) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  await db
    .update(cars)
    .set({ isDeleted: true, deletedAt: new Date(), deletedBy: user.id })
    .where(eq(cars.id, params.id));

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
