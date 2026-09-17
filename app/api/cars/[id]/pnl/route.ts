import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { computeCarPnl } from "@/lib/pnl";

// GET /api/cars/[id]/pnl — profit net real al vânzării (ADMIN ONLY).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  const pnl = await computeCarPnl(params.id);
  if (!pnl) return NextResponse.json({ error: "Vânzarea nu a fost găsită." }, { status: 404 });
  return NextResponse.json({ pnl });
}
