import { NextResponse } from "next/server";
import { and, eq, desc, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, users } from "@/lib/schema";
import { requireSession, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { leadToDTO } from "@/lib/serialize";
import { notify } from "@/lib/notify";

const SOURCES = ["call", "site", "999", "instagram", "walk_in", "referral", "other"];
const STATUSES = ["new", "contacted", "viewing", "negotiating", "won", "lost"];

// GET /api/leads — listă lead-uri (orice utilizator autentificat).
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  const conds: SQL[] = [eq(leads.isDeleted, false)];
  if (status && STATUSES.includes(status)) conds.push(eq(leads.status, status));

  const rows = await db.select().from(leads).where(and(...conds)).orderBy(desc(leads.createdAt));
  return NextResponse.json({ leads: rows.map(leadToDTO) });
}

// POST /api/leads — creează un lead.
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { clientName, clientPhone, source, interestBrand, interestModel, budget, inventoryId, status, notes } = body;
  let { assignedTo } = body;

  if (!clientName || !String(clientName).trim()) {
    return NextResponse.json({ error: "Numele clientului este obligatoriu." }, { status: 400 });
  }

  let assignedToName: string | null = null;
  if (assignedTo && isUuid(assignedTo)) {
    const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, assignedTo)).limit(1);
    assignedToName = u?.fullName ?? null;
    if (!u) assignedTo = null;
  } else assignedTo = null;

  const [lead] = await db
    .insert(leads)
    .values({
      clientName: String(clientName).trim(),
      clientPhone: clientPhone ? String(clientPhone) : null,
      source: SOURCES.includes(source) ? source : "call",
      interestBrand: interestBrand || null,
      interestModel: interestModel || null,
      budget: budget !== undefined && budget !== "" ? Number(budget) : null,
      inventoryId: inventoryId && isUuid(inventoryId) ? inventoryId : null,
      status: STATUSES.includes(status) ? status : "new",
      assignedTo, assignedToName,
      notes: notes || null,
      createdBy: user.id, createdByName: user.fullName,
    })
    .returning();

  if (assignedTo && assignedTo !== user.id) {
    await notify({ userId: assignedTo, type: "lead", title: "Lead nou atribuit", body: `${lead.clientName}${lead.clientPhone ? ` · ${lead.clientPhone}` : ""}`, link: "/dashboard/leads" });
  }

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_LEAD",
    details: { leadId: lead.id, client: lead.clientName }, request, coords: coordsOf(user),
  });

  return NextResponse.json({ lead: leadToDTO(lead) }, { status: 201 });
}
