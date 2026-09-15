import { NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, inventory } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// GET /api/stats — ADMIN ONLY. Agregări pentru grafice.
export async function GET(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const log = searchParams.get("log") === "1";

  const conds = [eq(cars.isDeleted, false), eq(cars.status, "sold")];
  if (dateFrom) conds.push(gte(cars.saleDate, new Date(dateFrom)));
  if (dateTo) conds.push(lte(cars.saleDate, new Date(dateTo + "T23:59:59")));

  const sales = await db
    .select({
      priceSell: cars.priceSell,
      priceBuy: cars.priceBuy,
      saleDate: cars.saleDate,
      soldByName: cars.soldByName,
    })
    .from(cars)
    .where(and(...conds));

  const byMonth: Record<string, { count: number; revenue: number; profit: number }> = {};
  const byWorker: Record<string, number> = {};
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const s of sales) {
    const month = new Date(s.saleDate).toISOString().slice(0, 7);
    byMonth[month] ??= { count: 0, revenue: 0, profit: 0 };
    byMonth[month].count += 1;
    byMonth[month].revenue += Number(s.priceSell);
    byMonth[month].profit += Number(s.priceSell) - Number(s.priceBuy);
    const w = s.soldByName || "Necunoscut";
    byWorker[w] = (byWorker[w] || 0) + 1;
    totalRevenue += Number(s.priceSell);
    totalProfit += Number(s.priceSell) - Number(s.priceBuy);
  }

  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  const topWorkers = Object.entries(byWorker)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalSales = sales.length;
  const avgSellPrice = totalSales ? totalRevenue / totalSales : 0;

  // Numărători globale pe status (fără filtru de dată) — pentru cardurile overview.
  const countWhere = (extra?: ReturnType<typeof eq>) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cars)
      .where(extra ? and(eq(cars.isDeleted, false), extra) : eq(cars.isDeleted, false))
      .then((r) => r[0].count);

  const [allCount, soldCount, availableCount, reservedCount] = await Promise.all([
    countWhere(),
    countWhere(eq(cars.status, "sold")),
    countWhere(eq(cars.status, "available")),
    countWhere(eq(cars.status, "reserved")),
  ]);

  // Numărători pentru STOC (tabelul inventory).
  const invCount = (extra?: ReturnType<typeof eq>) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(extra ? and(eq(inventory.isDeleted, false), extra) : eq(inventory.isDeleted, false))
      .then((r) => r[0].count);
  const [stockTotal, stockAvailable, stockSold] = await Promise.all([
    invCount(),
    invCount(eq(inventory.status, "available")),
    invCount(eq(inventory.status, "sold")),
  ]);
  // Valoarea stocului disponibil (suma prețurilor de vânzare).
  const [{ stockValue }] = await db
    .select({ stockValue: sql<number>`coalesce(sum(${inventory.sellPrice}),0)::float8` })
    .from(inventory)
    .where(and(eq(inventory.isDeleted, false), eq(inventory.status, "available")));

  if (log) {
    await logAction({
      userId: user.id,
      userName: user.fullName,
      action: "VIEW_STATISTICS",
      details: { dateFrom, dateTo },
      request,
      coords: coordsOf(user),
    });
  }

  return NextResponse.json({
    monthly,
    topWorkers,
    totalSales,
    totalRevenue,
    totalProfit,
    avgSellPrice,
    counts: { total: allCount, sold: soldCount, available: availableCount, reserved: reservedCount },
    stock: { total: stockTotal, available: stockAvailable, sold: stockSold, value: stockValue },
  });
}
