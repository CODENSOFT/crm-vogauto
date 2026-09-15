import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workOrders, users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { workOrderToDTO } from "@/lib/serialize";

const TYPES = ["service", "wash", "detailing", "other"];
const STATUSES = ["pending", "in_progress", "done"];

// PUT /api/work-orders/[id] — ADMIN ONLY.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Lucrarea nu a fost găsită." }, { status: 404 });
  const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, params.id)).limit(1);
  if (!wo || wo.isDeleted) return NextResponse.json({ error: "Lucrarea nu a fost găsită." }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.type !== undefined && TYPES.includes(body.type)) updates.type = body.type;
  if (body.status !== undefined && STATUSES.includes(body.status)) updates.status = body.status;
  if (body.carLabel !== undefined) updates.carLabel = body.carLabel ? String(body.carLabel) : null;
  if (body.cost !== undefined) updates.cost = Number(body.cost) || 0;
  if (body.dateIn !== undefined) updates.dateIn = body.dateIn ? new Date(body.dateIn) : null;
  if (body.dateOut !== undefined) updates.dateOut = body.dateOut ? new Date(body.dateOut) : null;
  if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes) : null;
  if (body.responsibleId !== undefined) {
    if (body.responsibleId && isUuid(body.responsibleId)) {
      const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, body.responsibleId)).limit(1);
      if (u) { updates.responsibleId = u.id; updates.responsibleName = u.fullName; }
    } else {
      updates.responsibleId = null; updates.responsibleName = null;
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });

  const [saved] = await db.update(workOrders).set(updates).where(eq(workOrders.id, params.id)).returning();
  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_WORK_ORDER",
    details: { workOrderId: params.id, changes: Object.keys(updates) }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ workOrder: workOrderToDTO(saved) });
}

// DELETE /api/work-orders/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Lucrarea nu a fost găsită." }, { status: 404 });
  const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, params.id)).limit(1);
  if (!wo || wo.isDeleted) return NextResponse.json({ error: "Lucrarea nu a fost găsită." }, { status: 404 });

  await db.update(workOrders).set({ isDeleted: true }).where(eq(workOrders.id, params.id));
  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_WORK_ORDER",
    details: { workOrderId: params.id, type: wo.type }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ ok: true });
}
