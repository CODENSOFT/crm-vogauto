import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// POST /api/cars/[id]/reveal-phone — ADMIN ONLY. Întoarce numărul complet + log.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await connectDB();
  const car = await Car.findById(params.id).lean();
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
