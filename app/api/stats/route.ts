import { NextResponse } from "next/server";
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, inventory, users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// GET /api/stats — ADMIN ONLY. Agregări pentru panoul de statistici.
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
      soldBy: cars.soldBy,
      soldByName: cars.soldByName,
      paymentMethod: cars.paymentMethod,
      brand: cars.brand,
    })
    .from(cars)
    .where(and(...conds));

  // Taxa fixă a fiecărui vânzător (comisionul plătit per vânzare) — se scade din profit.
  const sellerIds = Array.from(new Set(sales.map((s) => s.soldBy).filter((x): x is string => !!x)));
  const feeRows = sellerIds.length
    ? await db.select({ id: users.id, fixedFee: users.fixedFee }).from(users).where(inArray(users.id, sellerIds))
    : [];
  const feeMap = new Map(feeRows.map((u) => [u.id, Number(u.fixedFee ?? 0)]));

  const byMonth: Record<string, { count: number; revenue: number; profit: number }> = {};
  const byWorker: Record<string, { count: number; revenue: number; profit: number }> = {};
  const byPayment: Record<string, { count: number; revenue: number }> = {};
  const byBrand: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const s of sales) {
    const rev = Number(s.priceSell);
    const fee = s.soldBy ? (feeMap.get(s.soldBy) ?? 0) : 0;
    const prof = Number(s.priceSell) - Number(s.priceBuy) - fee; // profit NET (fără comision)
    const month = new Date(s.saleDate).toISOString().slice(0, 7);
    byMonth[month] ??= { count: 0, revenue: 0, profit: 0 };
    byMonth[month].count += 1; byMonth[month].revenue += rev; byMonth[month].profit += prof;

    const w = s.soldByName || "Necunoscut";
    byWorker[w] ??= { count: 0, revenue: 0, profit: 0 };
    byWorker[w].count += 1; byWorker[w].revenue += rev; byWorker[w].profit += prof;

    const pm = s.paymentMethod || "cash";
    byPayment[pm] ??= { count: 0, revenue: 0 };
    byPayment[pm].count += 1; byPayment[pm].revenue += rev;

    const br = s.brand || "—";
    byBrand[br] ??= { count: 0, revenue: 0 };
    byBrand[br].count += 1; byBrand[br].revenue += rev;

    totalRevenue += rev; totalProfit += prof;
  }

  const monthly = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));
  const topWorkers = Object.entries(byWorker).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.profit - a.profit);
  const payment = Object.entries(byPayment).map(([method, v]) => ({ method, ...v }));
  const brands = Object.entries(byBrand).map(([brand, v]) => ({ brand, ...v })).sort((a, b) => b.count - a.count).slice(0, 8);

  const totalSales = sales.length;
  const avgSellPrice = totalSales ? totalRevenue / totalSales : 0;
  const avgProfit = totalSales ? totalProfit / totalSales : 0;
  const profitMargin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;
  const bestMonth = monthly.length ? monthly.reduce((a, b) => (b.profit > a.profit ? b : a)) : null;

  // Luna curentă vs luna precedentă (independent de filtru).
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthAgg = async (from: Date, to: Date) => {
    // Profit NET: scădem taxa fixă a vânzătorului (join la users pe soldBy).
    const [r] = await db
      .select({
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${cars.priceSell}),0)::float8`,
        profit: sql<number>`coalesce(sum(${cars.priceSell} - ${cars.priceBuy} - coalesce(${users.fixedFee}, 0)),0)::float8`,
      })
      .from(cars)
      .leftJoin(users, eq(cars.soldBy, users.id))
      .where(and(eq(cars.isDeleted, false), eq(cars.status, "sold"), gte(cars.saleDate, from), lte(cars.saleDate, to)));
    return r;
  };
  const [thisMonth, lastMonth] = await Promise.all([
    monthAgg(mStart, new Date(mEnd.getTime() - 1)),
    monthAgg(pStart, new Date(mStart.getTime() - 1)),
  ]);

  // Numărători + stoc.
  const countWhere = (extra?: ReturnType<typeof eq>) =>
    db.select({ count: sql<number>`count(*)::int` }).from(cars)
      .where(extra ? and(eq(cars.isDeleted, false), extra) : eq(cars.isDeleted, false)).then((r) => r[0].count);
  const [allCount, soldCount, availableCount, reservedCount] = await Promise.all([
    countWhere(), countWhere(eq(cars.status, "sold")), countWhere(eq(cars.status, "available")), countWhere(eq(cars.status, "reserved")),
  ]);

  const invCount = (extra?: ReturnType<typeof eq>) =>
    db.select({ count: sql<number>`count(*)::int` }).from(inventory)
      .where(extra ? and(eq(inventory.isDeleted, false), extra) : eq(inventory.isDeleted, false)).then((r) => r[0].count);
  const [stockTotal, stockAvailable, stockSold] = await Promise.all([
    invCount(), invCount(eq(inventory.status, "available")), invCount(eq(inventory.status, "sold")),
  ]);
  const [{ stockValue, avgAgeDays }] = await db
    .select({
      stockValue: sql<number>`coalesce(sum(${inventory.sellPrice}),0)::float8`,
      avgAgeDays: sql<number>`coalesce(avg(extract(epoch from (now() - ${inventory.createdAt})) / 86400), 0)::float8`,
    })
    .from(inventory)
    .where(and(eq(inventory.isDeleted, false), eq(inventory.status, "available")));

  if (log) {
    await logAction({ userId: user.id, userName: user.fullName, action: "VIEW_STATISTICS", details: { dateFrom, dateTo }, request, coords: coordsOf(user) });
  }

  return NextResponse.json({
    monthly, topWorkers, payment, brands,
    totalSales, totalRevenue, totalProfit, avgSellPrice, avgProfit, profitMargin,
    bestMonth,
    thisMonth, lastMonth,
    counts: { total: allCount, sold: soldCount, available: availableCount, reserved: reservedCount },
    stock: { total: stockTotal, available: stockAvailable, sold: stockSold, value: stockValue, avgAgeDays },
  });
}
