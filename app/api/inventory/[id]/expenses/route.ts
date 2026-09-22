import { NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, inventoryExpenses } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";

function toDTO(row: typeof inventoryExpenses.$inferSelect) {
  const { id, ...rest } = row;
  return { ...rest, _id: id, amount: Number(row.amount) };
}

// GET /api/inventory/[id]/expenses — cheltuielile unei mașini + totalul.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const rows = await db
    .select()
    .from(inventoryExpenses)
    .where(eq(inventoryExpenses.inventoryId, params.id))
    .orderBy(asc(inventoryExpenses.createdAt));

  const expenses = rows.map(toDTO);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return NextResponse.json({ expenses, total });
}

// POST /api/inventory/[id]/expenses — ADMIN ONLY. Adaugă o cheltuială.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const [car] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!car || car.isDeleted) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const body = await request.json();
  const label = String(body.label ?? "").trim();
  const amount = Number(body.amount);
  if (!label) return NextResponse.json({ error: "Scrieți ce cheltuială este." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Suma nu este validă." }, { status: 400 });

  const [saved] = await db
    .insert(inventoryExpenses)
    .values({
      inventoryId: params.id,
      label,
      amount,
      note: body.note ? String(body.note) : null,
      createdBy: user.id,
      createdByName: user.fullName,
    })
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "ADD_EXPENSE",
    details: { stockId: params.id, label, amount }, request, coords: coordsOf(user),
  });

  return NextResponse.json({ expense: toDTO(saved) }, { status: 201 });
}

// DELETE /api/inventory/[id]/expenses?expenseId=... — ADMIN ONLY.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const expenseId = new URL(request.url).searchParams.get("expenseId") ?? "";
  if (!isUuid(params.id) || !isUuid(expenseId)) {
    return NextResponse.json({ error: "Cheltuiala nu a fost găsită." }, { status: 404 });
  }

  const [row] = await db
    .delete(inventoryExpenses)
    .where(and(eq(inventoryExpenses.id, expenseId), eq(inventoryExpenses.inventoryId, params.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "Cheltuiala nu a fost găsită." }, { status: 404 });

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_EXPENSE",
    details: { stockId: params.id, label: row.label, amount: Number(row.amount) },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
