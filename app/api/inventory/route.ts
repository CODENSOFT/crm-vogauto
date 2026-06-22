import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { escapeRegex } from "@/lib/utils";

// GET /api/inventory — listă stoc. Orice utilizator autentificat (workerii o
// folosesc pentru a alege o mașină la înregistrarea vânzării).
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim();

  await connectDB();
  const query: Record<string, unknown> = { isDeleted: false };
  if (status === "available" || status === "sold") query.status = status;
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { brand: { $regex: safe, $options: "i" } },
      { model: { $regex: safe, $options: "i" } },
      { vin: { $regex: safe, $options: "i" } },
      { ownerName: { $regex: safe, $options: "i" } },
    ];
  }

  const items = await Inventory.find(query).sort({ createdAt: -1 }).lean();
  const data = items.map((c) => ({
    ...c,
    _id: String(c._id),
    markup: Number(c.sellPrice) - Number(c.clientWantPrice),
  }));

  return NextResponse.json({ items: data });
}

// POST /api/inventory — ADMIN ONLY. Adaugă o mașină în stoc.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    brand, model, year, vin, color,
    ownerName, ownerPhone, clientWantPrice, sellPrice, status, notes,
  } = body;

  if (!brand || !model || !year || !ownerName || !ownerPhone || sellPrice === undefined || sellPrice === "") {
    return NextResponse.json({ error: "Completați marca, modelul, anul, proprietarul, telefonul și prețul de vânzare." }, { status: 400 });
  }

  await connectDB();
  const item = await Inventory.create({
    brand, model, year: Number(year),
    vin: vin ? String(vin).trim() : undefined,
    color: color || undefined,
    ownerName, ownerPhone,
    clientWantPrice: Number(clientWantPrice) || 0,
    sellPrice: Number(sellPrice),
    status: status === "sold" ? "sold" : "available",
    notes: notes || undefined,
    addedBy: user.id, addedByName: user.fullName,
  });

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_STOCK",
    details: { stockId: String(item._id), brand, model, vin, sellPrice: Number(sellPrice) },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({
    item: { ...item.toObject(), _id: String(item._id), markup: Number(item.sellPrice) - Number(item.clientWantPrice) },
  }, { status: 201 });
}
