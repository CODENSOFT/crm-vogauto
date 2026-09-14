import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";

// POST /api/cars/[id]/reveal-phone — ADMIN ONLY. Întoarce numărul complet + log.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  const [car] = await db.select().from(cars).where(eq(cars.id, params.id)).limit(1);
  if (!car) {
    return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  }

  await logAction({
    userId: user.id,
    userName: user.fullName,
    action: "REVEAL_PHONE",
    details: { carId: params.id, client: car.clientName, vin: car.vin },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ phone: car.clientPhone });
}
