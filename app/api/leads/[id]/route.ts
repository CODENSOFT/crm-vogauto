import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, users } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { leadToDTO } from "@/lib/serialize";

const SOURCES = ["call", "site", "999", "instagram", "walk_in", "referral", "other"];
const STATUSES = ["new", "contacted", "viewing", "negotiating", "won", "lost"];

// PUT /api/leads/[id] — actualizează un lead (orice utilizator autentificat).
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireSession();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Lead-ul nu a fost găsit." }, { status: 404 });
  const [lead] = await db.select().from(leads).where(eq(leads.id, params.id)).limit(1);
  if (!lead || lead.isDeleted) return NextResponse.json({ error: "Lead-ul nu a fost găsit." }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.clientName !== undefined && String(body.clientName).trim()) updates.clientName = String(body.clientName).trim();
  if (body.clientPhone !== undefined) updates.clientPhone = body.clientPhone || null;
  if (body.source !== undefined && SOURCES.includes(body.source)) updates.source = body.source;
  if (body.interestBrand !== undefined) updates.interestBrand = body.interestBrand || null;
  if (body.interestModel !== undefined) updates.interestModel = body.interestModel || null;
  if (body.budget !== undefined) updates.budget = body.budget === "" || body.budget === null ? null : Number(body.budget);
  if (body.inventoryId !== undefined) updates.inventoryId = body.inventoryId && isUuid(body.inventoryId) ? body.inventoryId : null;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.status !== undefined && STATUSES.includes(body.status)) {
    updates.status = body.status;
    if (["contacted", "viewing", "negotiating"].includes(body.status)) updates.lastContactAt = new Date();
  }
  if (body.lastContactAt !== undefined) updates.lastContactAt = body.lastContactAt ? new Date(body.lastContactAt) : null;
  if (body.assignedTo !== undefined) {
    if (body.assignedTo && isUuid(body.assignedTo)) {
      const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, body.assignedTo)).limit(1);
      if (u) { updates.assignedTo = u.id; updates.assignedToName = u.fullName; }
    } else { updates.assignedTo = null; updates.assignedToName = null; }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nimic de modificat." }, { status: 400 });

  const [saved] = await db.update(leads).set(updates).where(eq(leads.id, params.id)).returning();
  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_LEAD",
    details: { leadId: params.id, changes: Object.keys(updates) }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ lead: leadToDTO(saved) });
}

// DELETE /api/leads/[id] — ADMIN ONLY. Soft delete.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Lead-ul nu a fost găsit." }, { status: 404 });
  const [lead] = await db.select().from(leads).where(eq(leads.id, params.id)).limit(1);
  if (!lead || lead.isDeleted) return NextResponse.json({ error: "Lead-ul nu a fost găsit." }, { status: 404 });
  await db.update(leads).set({ isDeleted: true }).where(eq(leads.id, params.id));
  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_LEAD",
    details: { leadId: params.id, client: lead.clientName }, request, coords: coordsOf(user),
  });
  return NextResponse.json({ ok: true });
}
