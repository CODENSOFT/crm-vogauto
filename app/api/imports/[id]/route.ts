import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { imports, inventory } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { importToDTO } from "@/lib/serialize";
import { notifyAdmins } from "@/lib/notify";
import { resolveResponsibles } from "@/lib/resolveUsers";

const STAGES = ["in_transit", "customs", "ready"];

// PUT /api/imports/[id] — ADMIN ONLY.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });
  const [imp] = await db.select().from(imports).where(eq(imports.id, params.id)).limit(1);
  if (!imp || imp.isDeleted) return NextResponse.json({ error: "Importul nu a fost găsit." }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const strFields = ["brand", "model", "vin", "color", "engine", "source", "supplierName", "notes"];
  for (const f of strFields) if (body[f] !== undefined) updates[f] = body[f] ? String(body[f]) : null;
  if (body.year !== undefined) updates.year = body.year ? Number(body.year) : null;
  if (body.stage !== undefined && STAGES.includes(body.stage)) updates.stage = body.stage;
  if (body.purchasePrice !== undefined) updates.purchasePrice = Number(body.purchasePrice) || 0;
  if (body.customsCost !== undefined) updates.customsCost = Number(body.customsCost) || 0;
  if (body.otherCosts !== undefined) updates.otherCosts = Number(body.otherCosts) || 0;
  if (body.expectedDate !== undefined) updates.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
  if (body.arrivedDate !== undefined) updates.arrivedDate = body.arrivedDate ? new Date(body.arrivedDate) : null;
  if (body.responsibleIds !== undefined || body.responsibleId !== undefined) {
    const r = await resolveResponsibles(body.responsibleIds ?? body.responsibleId);
    updates.responsibleId = r.ids[0] ?? null;
    updates.responsibleName = r.names[0] ?? null;
    updates.responsibleIds = r.ids;
    updates.responsibleNames = r.names;
  }

  // Când importul devine „gata de vânzare", creează automat mașina în stoc
  // (o singură dată — legată prin imports.inventoryId).
  const finalStage = (updates.stage as string) ?? imp.stage;
  if (finalStage === "ready" && !imp.inventoryId) {
    const brand = (updates.brand as string) ?? imp.brand;
    const model = (updates.model as string) ?? imp.model;
    const year = (updates.year as number) ?? imp.year ?? new Date().getFullYear();
    const vin = (updates.vin as string | null) ?? imp.vin;
    const color = (updates.color as string | null) ?? imp.color;
    const engine = (updates.engine as string | null) ?? imp.engine;
    const purchase = (updates.purchasePrice as number) ?? Number(imp.purchasePrice);
    const customs = (updates.customsCost as number) ?? Number(imp.customsCost);
    const other = (updates.otherCosts as number) ?? Number(imp.otherCosts);
    const [inv] = await db
      .insert(inventory)
      .values({
        brand, model, year: Number(year), vin: vin || null,
        color: color || null, engine: engine || null,
        ownerName: imp.supplierName || "Import propriu",
        ownerPhone: "—",
        clientWantPrice: purchase + customs + other, // baza de cost
        sellPrice: 0, // prețul de vânzare se setează de admin
        status: "available",
        notes: "Adăugată automat din import.",
        addedBy: user.id, addedByName: user.fullName,
      })
      .returning();
    updates.inventoryId = inv.id;
    await notifyAdmins({
      type: "stock", title: "Mașină gata de vânzare",
      body: `${brand} ${model} ${year} a fost adăugată automat în stoc (din import). Setează prețul de vânzare.`,
      link: `/dashboard/inventory/${inv.id}`,
    });
  }

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
