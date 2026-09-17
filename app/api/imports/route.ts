import { NextResponse } from "next/server";
import { and, eq, desc, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { imports, users } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { importToDTO } from "@/lib/serialize";

const STAGES = ["in_transit", "customs", "ready"];

// GET /api/imports — listă importuri (orice utilizator autentificat).
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage")?.trim();

  const conds: SQL[] = [eq(imports.isDeleted, false)];
  if (stage && STAGES.includes(stage)) conds.push(eq(imports.stage, stage));

  const rows = await db.select().from(imports).where(and(...conds)).orderBy(desc(imports.createdAt));
  return NextResponse.json({ imports: rows.map(importToDTO) });
}

// POST /api/imports — ADMIN ONLY.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { brand, model, year, vin, source, supplierName, stage, purchasePrice, customsCost, otherCosts, responsibleId, expectedDate, arrivedDate, notes } = body;

  if (!brand || !model) return NextResponse.json({ error: "Marca și modelul sunt obligatorii." }, { status: 400 });

  let responsibleName: string | null = null;
  let respId: string | null = null;
  if (responsibleId && isUuid(responsibleId)) {
    const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, responsibleId)).limit(1);
    if (u) { respId = u.id; responsibleName = u.fullName; }
  }

  const [imp] = await db
    .insert(imports)
    .values({
      brand, model,
      year: year ? Number(year) : null,
      vin: vin ? String(vin).trim() : null,
      source: source ? String(source) : null,
      supplierName: supplierName ? String(supplierName) : null,
      stage: STAGES.includes(stage) ? stage : "in_transit",
      purchasePrice: Number(purchasePrice) || 0,
      customsCost: Number(customsCost) || 0,
      otherCosts: Number(otherCosts) || 0,
      responsibleId: respId,
      responsibleName,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      arrivedDate: arrivedDate ? new Date(arrivedDate) : null,
      notes: notes ? String(notes) : null,
      createdBy: user.id,
      createdByName: user.fullName,
    })
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_IMPORT",
    details: { importId: imp.id, brand, model }, request, coords: coordsOf(user),
  });

  return NextResponse.json({ import: importToDTO(imp) }, { status: 201 });
}
