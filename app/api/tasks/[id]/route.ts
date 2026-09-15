import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { taskToDTO } from "@/lib/serialize";

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

  // Schimbare de status (permisă și workerului pe sarcina proprie).
  if (body.status !== undefined && STATUSES.includes(body.status)) {
    if (!isAdmin && task.assignedTo !== user.id) {
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
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.carLabel !== undefined) updates.carLabel = body.carLabel ? String(body.carLabel) : null;
    if (body.assignedTo !== undefined && isUuid(body.assignedTo)) {
      const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, body.assignedTo)).limit(1);
      if (u) { updates.assignedTo = u.id; updates.assignedToName = u.fullName; }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });
  }

  const [saved] = await db.update(tasks).set(updates).where(eq(tasks.id, params.id)).returning();

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

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_TASK",
    details: { taskId: params.id, title: task.title },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
