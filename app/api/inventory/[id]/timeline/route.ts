import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { computeTimeline } from "@/lib/timeline";

// GET /api/inventory/[id]/timeline — istoricul complet al mașinii din stoc.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Nu a fost găsită." }, { status: 404 });
  const [inv] = await db.select({ vin: inventory.vin }).from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!inv) return NextResponse.json({ error: "Nu a fost găsită." }, { status: 404 });
  const events = await computeTimeline({ vin: inv.vin, inventoryId: params.id });
  return NextResponse.json({ events });
}
