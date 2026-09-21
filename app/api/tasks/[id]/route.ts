import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, workOrders } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { taskToDTO } from "@/lib/serialize";
import { resolveResponsibles } from "@/lib/resolveUsers";

const TYPES = ["general", "test_drive", "bring_car", "to_asp", "service", "wash", "detailing", "customs", "delivery"];
const STATUSES = ["todo", "in_progress", "done"];
const PRIORITIES = ["low", "normal", "high"];

// PUT /api/tasks/[id] — adminul editează orice; workerul poate schimba doar
// statusul unei sarcini proprii.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireSession();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Sarcina nu a fost găsită." }, { status: 404 });
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task || task.isDeleted) {
    return NextResponse.json({ error: "Sarcina nu a fost găsită." }, { status: 404 });
  }

  const isAdmin = user.role === "admin";
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  const isAssignee = (task.assignedToIds ?? []).includes(user.id) || task.assignedTo === user.id;

  // Schimbare de status (permisă și responsabililor sarcinii).
  if (body.status !== undefined && STATUSES.includes(body.status)) {
    if (!isAdmin && !isAssignee) {
      return NextResponse.json({ error: "Puteți modifica doar sarcinile proprii." }, { status: 403 });
    }
    updates.status = body.status;
    updates.completedAt = body.status === "done" ? new Date() : null;
  }

  // Restul câmpurilor: doar adminul.
  if (isAdmin) {
    if (body.title !== undefined && String(body.title).trim()) updates.title = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description) : null;
    if (body.type !== undefined && TYPES.includes(body.type)) updates.type = body.type;
    if (body.priority !== undefined && PRIORITIES.includes(body.priority)) updates.priority = body.priority;
    if (body.dueDate !== undefined) { updates.dueDate = body.dueDate ? new Date(body.dueDate) : null; updates.reminded = false; }
    if (body.carLabel !== undefined) updates.carLabel = body.carLabel ? String(body.carLabel) : null;
    if (body.assignedToIds !== undefined || body.assignedTo !== undefined) {
      const r = await resolveResponsibles(body.assignedToIds ?? body.assignedTo);
      updates.assignedToIds = r.ids;
      updates.assignedToNames = r.names;
      updates.assignedTo = r.ids[0] ?? null;
      updates.assignedToName = r.names[0] ?? null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });
  }

  const [saved] = await db.update(tasks).set(updates).where(eq(tasks.id, params.id)).returning();

  // Sincronizează lucrarea legată (dacă există): status + responsabil + termen.
  if (saved.workOrderId) {
    const woUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      woUpdates.status = updates.status === "done" ? "done" : updates.status === "in_progress" ? "in_progress" : "pending";
    }
    if (isAdmin) {
      if (updates.assignedToIds !== undefined) {
        woUpdates.responsibleId = updates.assignedTo;
        woUpdates.responsibleName = updates.assignedToName;
        woUpdates.responsibleIds = updates.assignedToIds;
        woUpdates.responsibleNames = updates.assignedToNames;
      }
      if (updates.dueDate !== undefined) woUpdates.dateIn = updates.dueDate;
      if (updates.type !== undefined && ["service", "wash", "detailing"].includes(updates.type as string)) woUpdates.type = updates.type;
    }
    if (Object.keys(woUpdates).length) {
      await db.update(workOrders).set(woUpdates).where(eq(workOrders.id, saved.workOrderId));
    }
  }

  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_TASK",
    details: { taskId: params.id, title: saved.title, changes: Object.keys(updates) },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ task: taskToDTO(saved) });
}

// DELETE /api/tasks/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Sarcina nu a fost găsită." }, { status: 404 });
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task || task.isDeleted) {
    return NextResponse.json({ error: "Sarcina nu a fost găsită." }, { status: 404 });
  }

  await db.update(tasks).set({ isDeleted: true }).where(eq(tasks.id, params.id));

  // Șterge și lucrarea generată automat, dacă există.
  if (task.workOrderId) {
    await db.update(workOrders).set({ isDeleted: true }).where(eq(workOrders.id, task.workOrderId));
  }

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_TASK",
    details: { taskId: params.id, title: task.title },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
