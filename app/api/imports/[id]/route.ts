import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { imports, users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { importToDTO } from "@/lib/serialize";

const STAGES = ["purchased", "in_transit", "arrived", "customs", "ready", "done"];

// PUT /api/imports/[id] — ADMIN ONLY.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });
  const [imp] = await db.select().from(imports).where(eq(imports.id, params.id)).limit(1);
  if (!imp || imp.isDeleted) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const strFields = ["brand", "model", "vin", "source", "supplierName", "notes"];
  for (const f of strFields) if (body[f] !== undefined) updates[f] = body[f] ? String(body[f]) : null;
  if (body.year !== undefined) updates.year = body.year ? Number(body.year) : null;
  if (body.stage !== undefined && STAGES.includes(body.stage)) updates.stage = body.stage;
  if (body.purchasePrice !== undefined) updates.purchasePrice = Number(body.purchasePrice) || 0;
  if (body.customsCost !== undefined) updates.customsCost = Number(body.customsCost) || 0;
  if (body.otherCosts !== undefined) updates.otherCosts = Number(body.otherCosts) || 0;
  if (body.expectedDate !== undefined) updates.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
  if (body.arrivedDate !== undefined) updates.arrivedDate = body.arrivedDate ? new Date(body.arrivedDate) : null;
  if (body.responsibleId !== undefined) {
    if (body.responsibleId && isUuid(body.responsibleId)) {
      const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, body.responsibleId)).limit(1);
      if (u) { updates.responsibleId = u.id; updates.responsibleName = u.fullName; }
    } else { updates.responsibleId = null; updates.responsibleName = null; }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });

  const [saved] = await db.update(imports).set(updates).where(eq(imports.id, params.id)).returning();
  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_IMPORT",
    details: { importId: params.id, changes: Object.keys(updates) }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ import: importToDTO(saved) });
}

// DELETE /api/imports/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });
  const [imp] = await db.select().from(imports).where(eq(imports.id, params.id)).limit(1);
  if (!imp || imp.isDeleted) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });

  await db.update(imports).set({ isDeleted: true }).where(eq(imports.id, params.id));
  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_IMPORT",
    details: { importId: params.id, brand: imp.brand, model: imp.model }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ ok: true });
}
