import { NextResponse } from "next/server";
import { and, or, eq, ilike, gte, lte, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, users, inventory } from "@/lib/schema";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { escapeLike, isUuid } from "@/lib/utils";
import { carToDTO } from "@/lib/serialize";

// GET /api/cars — ADMIN ONLY. Listă cu paginare, filtre, căutare, sortare.
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 20;
  const search = searchParams.get("search")?.trim();
  const brand = searchParams.get("brand")?.trim();
  const worker = searchParams.get("worker")?.trim();
  const payment = searchParams.get("payment")?.trim();
  const status = searchParams.get("status")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sortBy = searchParams.get("sortBy") || "saleDate";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const conds = [eq(cars.isDeleted, false)];
  if (brand) conds.push(ilike(cars.brand, `%${escapeLike(brand)}%`));
  if (payment) conds.push(eq(cars.paymentMethod, payment));
  if (status) conds.push(eq(cars.status, status));
  if (worker) conds.push(ilike(cars.soldByName, `%${escapeLike(worker)}%`));
  if (dateFrom) conds.push(gte(cars.saleDate, new Date(dateFrom)));
  if (dateTo) conds.push(lte(cars.saleDate, new Date(dateTo + "T23:59:59")));
  if (search) {
    const safe = `%${escapeLike(search)}%`;
    conds.push(
      or(
        ilike(cars.clientName, safe),
        ilike(cars.clientPhone, safe),
        ilike(cars.vin, safe)
      )!
    );
  }
  const where = and(...conds);

  const sortCols = {
    saleDate: cars.saleDate,
    brand: cars.brand,
    model: cars.model,
    year: cars.year,
    priceSell: cars.priceSell,
    priceBuy: cars.priceBuy,
    clientName: cars.clientName,
  } as const;
  const sortCol = sortCols[sortBy as keyof typeof sortCols] ?? cars.saleDate;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cars)
    .where(where);

  const rows = await db
    .select()
    .from(cars)
    .where(where)
    .orderBy(sortDir === "asc" ? asc(sortCol) : desc(sortCol))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    cars: rows.map((c) => carToDTO(c, true)),
    total: count,
    page,
    pageSize,
  });
}

// POST /api/cars — admin ȘI worker.
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const {
    clientName, clientPhone, brand, model, year, vin, color,
    priceBuy, priceSell, profit, paymentMethod, saleDate, status, notes, soldBy, inventoryId,
  } = body;

  if (!clientName || !clientPhone || !brand || !model || !year || !vin || !priceSell) {
    return NextResponse.json({ error: "Completați toate câmpurile obligatorii." }, { status: 400 });
  }

  const isAdmin = user.role === "admin";
  const sell = Number(priceSell) || 0;
  const hasProfit = profit !== undefined && profit !== null && profit !== "";
  const hasBuy = priceBuy !== undefined && priceBuy !== null && priceBuy !== "";

  // Prețul de cumpărare: workerul introduce PROFITUL (buy = sell − profit);
  // adminul poate da fie profit, fie buy, ambele opționale (fără mirror automat).
  let buy = 0;
  if (isAdmin) {
    if (hasProfit) buy = sell - Number(profit);
    else if (hasBuy) buy = Number(priceBuy);
  } else {
    buy = sell - (Number(profit) || 0);
  }

  // Vânzătorul: adminul poate alege; implicit el însuși.
  let soldById = user.id;
  let soldByName = user.fullName;
  if (isAdmin && soldBy && soldBy !== user.id && isUuid(soldBy)) {
    const [seller] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, soldBy))
      .limit(1);
    if (seller) { soldById = soldBy; soldByName = seller.fullName; }
  }

  try {
    const [car] = await db
      .insert(cars)
      .values({
        clientName, clientPhone, brand, model, year: Number(year),
        vin: String(vin).trim(), color: color || null,
        priceBuy: buy, priceSell: sell,
        paymentMethod: paymentMethod || "cash",
        status: isAdmin ? status || "sold" : "sold",
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        soldBy: soldById, soldByName, notes: notes || null,
      })
      .returning();

    await logAction({
      userId: user.id, userName: user.fullName, action: "CREATE_SALE",
      details: { carId: car.id, brand, model, vin, priceSell: sell, profit: sell - buy },
      request,
      coords: coordsOf(user),
    });

    // Dacă vânzarea provine dintr-o mașină din stoc, o marcăm „vândută"
    // (rămâne în listă pentru istoric).
    if (inventoryId && isUuid(inventoryId)) {
      await db
        .update(inventory)
        .set({ status: "sold", soldBy: user.id, soldByName: user.fullName, saleId: car.id, saleDate: car.saleDate })
        .where(and(eq(inventory.id, inventoryId), eq(inventory.isDeleted, false), eq(inventory.status, "available")));
    }

    if (!isAdmin) return NextResponse.json({ ok: true }, { status: 201 });
    return NextResponse.json({ car: carToDTO(car, false) }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    return NextResponse.json({ error: e.code === "23505" ? "VIN deja existent." : "Eroare la salvare." }, { status: 400 });
  }
}
