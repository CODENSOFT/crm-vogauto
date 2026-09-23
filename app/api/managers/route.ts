import { NextResponse } from "next/server";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, users } from "@/lib/schema";
import { requireAdmin } from "@/lib/guard";
import { isUuid } from "@/lib/utils";

/** Adună vânzările pe manager și calculează plata cuvenită fiecăruia. */
async function buildManagers(dateFrom: string | null, dateTo: string | null) {
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
    })
    .from(cars)
    .where(and(...conds));

  const months = Array.from(new Set(sales.map((s) => new Date(s.saleDate).toISOString().slice(0, 7)))).sort();

  interface Agg {
    name: string;
    count: number;
    revenue: number;
    profit: number;
    monthly: Record<string, { count: number; profit: number }>;
  }
  const agg: Record<string, Agg> = {};
  for (const s of sales) {
    const id = String(s.soldBy ?? "necunoscut");
    const month = new Date(s.saleDate).toISOString().slice(0, 7);
    const profit = Number(s.priceSell) - Number(s.priceBuy);
    agg[id] ??= { name: s.soldByName || "Necunoscut", count: 0, revenue: 0, profit: 0, monthly: {} };
    agg[id].count += 1;
    agg[id].revenue += Number(s.priceSell);
    agg[id].profit += profit;
    agg[id].monthly[month] ??= { count: 0, profit: 0 };
    agg[id].monthly[month].count += 1;
    agg[id].monthly[month].profit += profit;
  }

  // Taxa fixă și bonusul din profilurile utilizatorilor.
  const ids = Object.keys(agg).filter((id) => isUuid(id));
  const userRows = ids.length
    ? await db.select({ id: users.id, fixedFee: users.fixedFee, bonus: users.bonus }).from(users).where(inArray(users.id, ids))
    : [];
  const feeMap = new Map(userRows.map((u) => [String(u.id), Number(u.fixedFee ?? 50)]));
  const bonusMap = new Map(userRows.map((u) => [String(u.id), Number(u.bonus ?? 0)]));

  const grandTotalProfit = sales.reduce((s, c) => s + (Number(c.priceSell) - Number(c.priceBuy)), 0);
  const grandTotalRevenue = sales.reduce((s, c) => s + Number(c.priceSell), 0);

  const managers = Object.entries(agg)
    .map(([id, a]) => {
      const fixedFee = feeMap.get(id) ?? 50;
      const bonus = bonusMap.get(id) ?? 0;
      const feeTotal = fixedFee * a.count;
      return {
        id,
        name: a.name,
        fixedFee,
        bonus,
        totalCount: a.count,
        totalRevenue: a.revenue,
        totalProfit: a.profit,
        profitPercent: grandTotalProfit ? (a.profit / grandTotalProfit) * 100 : 0,
        feeTotal,
        payout: feeTotal + bonus, // total de plată = taxă × vânzări + bonus
        monthly: months.map((m) => ({
          month: m,
          count: a.monthly[m]?.count ?? 0,
          profit: a.monthly[m]?.profit ?? 0,
        })),
      };
    })
    .sort((a, b) => b.payout - a.payout);

  return { months, managers, grandTotalProfit, grandTotalRevenue, grandTotalCount: sales.length };
}

// GET /api/managers — defalcare profit & vânzări pe manager × lună (admin only).
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const { months, managers, grandTotalProfit, grandTotalRevenue, grandTotalCount } = await buildManagers(dateFrom, dateTo);

  const grandTotalPayout = managers.reduce((s, m) => s + m.payout, 0);

  return NextResponse.json({
    months,
    grandTotalProfit,
    grandTotalRevenue,
    grandTotalCount,
    grandTotalPayout,
    managers,
  });
}
