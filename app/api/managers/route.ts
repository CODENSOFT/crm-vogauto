import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import User from "@/models/User";
import { requireAdmin } from "@/lib/guard";

// GET /api/managers — defalcare profit & vânzări pe manager × lună (admin only).
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  await connectDB();
  const query: Record<string, unknown> = { isDeleted: false, status: "sold" };
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo + "T23:59:59");
    query.saleDate = range;
  }

  const sales = await Car.find(query).select("priceSell priceBuy saleDate soldBy soldByName").lean();

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
  const ids = Object.keys(agg).filter((id) => id !== "necunoscut");
  const users = ids.length
    ? await User.find({ _id: { $in: ids } }).select("fixedFee bonus").lean()
    : [];
  const feeMap = new Map(users.map((u) => [String(u._id), Number(u.fixedFee ?? 50)]));
  const bonusMap = new Map(users.map((u) => [String(u._id), Number(u.bonus ?? 0)]));

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

  const grandTotalPayout = managers.reduce((s, m) => s + m.payout, 0);

  return NextResponse.json({
    months,
    grandTotalProfit,
    grandTotalRevenue,
    grandTotalCount: sales.length,
    grandTotalPayout,
    managers,
  });
}
