import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { computeTimeline } from "@/lib/timeline";

// GET /api/cars/[id]/timeline — istoricul complet al mașinii vândute.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Nu a fost găsită." }, { status: 404 });
  const [car] = await db.select({ vin: cars.vin }).from(cars).where(eq(cars.id, params.id)).limit(1);
  if (!car) return NextResponse.json({ error: "Nu a fost găsită." }, { status: 404 });
  const events = await computeTimeline({ vin: car.vin, carId: params.id });
  return NextResponse.json({ events });
}
