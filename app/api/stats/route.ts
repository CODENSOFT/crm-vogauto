import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
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

  await connectDB();
  const query: Record<string, unknown> = { isDeleted: false, status: "sold" };
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo + "T23:59:59");
    query.saleDate = range;
  }

  const sales = await Car.find(query).select("priceSell priceBuy saleDate soldByName").lean();

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
  const [allCount, soldCount, availableCount, reservedCount] = await Promise.all([
    Car.countDocuments({ isDeleted: false }),
    Car.countDocuments({ isDeleted: false, status: "sold" }),
    Car.countDocuments({ isDeleted: false, status: "available" }),
    Car.countDocuments({ isDeleted: false, status: "reserved" }),
  ]);

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
  });
}
