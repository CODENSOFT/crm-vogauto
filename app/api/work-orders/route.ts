import { NextResponse } from "next/server";
import { and, eq, or, desc, isNull, notInArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { workOrders, inventory } from "@/lib/schema";
import { resolveResponsibles } from "@/lib/resolveUsers";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { workOrderToDTO } from "@/lib/serialize";

const TYPES = ["service", "wash", "detailing", "other"];
const STATUSES = ["pending", "in_progress", "done"];

// GET /api/work-orders — listă lucrări (orice utilizator autentificat).
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.trim();
  const status = searchParams.get("status")?.trim();

  const conds: SQL[] = [eq(workOrders.isDeleted, false)];
  if (type && TYPES.includes(type)) conds.push(eq(workOrders.type, type));
  if (status && STATUSES.includes(status)) conds.push(eq(workOrders.status, status));

  // Ascunde lucrările pentru mașinile din stoc deja vândute.
  const soldRows = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.status, "sold"));
  const soldIds = soldRows.map((r) => r.id);
  if (soldIds.length) {
    conds.push(or(isNull(workOrders.inventoryId), notInArray(workOrders.inventoryId, soldIds))!);
  }

  const rows = await db
    .select()
    .from(workOrders)
    .where(and(...conds))
    .orderBy(desc(workOrders.createdAt));

  return NextResponse.json({ workOrders: rows.map(workOrderToDTO) });
}

// POST /api/work-orders — ADMIN ONLY.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { type, carLabel, carId, inventoryId, responsibleId, responsibleIds, status, cost, dateIn, dateOut, notes } = body;

  const r = await resolveResponsibles(responsibleIds ?? responsibleId);

  const [wo] = await db
    .insert(workOrders)
    .values({
      type: TYPES.includes(type) ? type : "service",
      carLabel: carLabel ? String(carLabel) : null,
      carId: carId && isUuid(carId) ? carId : null,
      inventoryId: inventoryId && isUuid(inventoryId) ? inventoryId : null,
      responsibleId: r.ids[0] ?? null,
      responsibleName: r.names[0] ?? null,
      responsibleIds: r.ids,
      responsibleNames: r.names,
      status: STATUSES.includes(status) ? status : "pending",
      cost: Number(cost) || 0,
      dateIn: dateIn ? new Date(dateIn) : null,
      dateOut: dateOut ? new Date(dateOut) : null,
      notes: notes ? String(notes) : null,
      createdBy: user.id,
      createdByName: user.fullName,
    })
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_WORK_ORDER",
    details: { workOrderId: wo.id, type: wo.type, car: wo.carLabel }, request, coords: coordsOf(user),
  });

  return NextResponse.json({ workOrder: workOrderToDTO(wo) }, { status: 201 });
}
