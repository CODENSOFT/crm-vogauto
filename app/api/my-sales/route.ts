import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import { requireSession } from "@/lib/guard";

// GET /api/my-sales — totalurile PROPRII ale utilizatorului curent, pe lună.
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;

  await connectDB();
  const sales = await Car.find({ soldBy: user.id, isDeleted: false, status: "sold" })
    .select("priceSell priceBuy saleDate")
    .lean();

  const fee = Number(user.fixedFee ?? 50);
  const bonus = Number(user.bonus ?? 0);

  const byMonth: Record<string, { count: number; revenue: number; profit: number }> = {};
  for (const c of sales) {
    const month = new Date(c.saleDate).toISOString().slice(0, 7);
    byMonth[month] ??= { count: 0, revenue: 0, profit: 0 };
    byMonth[month].count += 1;
    byMonth[month].revenue += Number(c.priceSell);
    byMonth[month].profit += Number(c.priceSell) - Number(c.priceBuy);
  }

  // Taxa câștigată într-o lună = taxa fixă × nr. vânzări din acea lună.
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, v]) => ({ month, ...v, fee: fee * v.count }));

  const totals = sales.reduce(
    (acc, c) => {
      acc.count += 1;
      acc.revenue += Number(c.priceSell);
      acc.profit += Number(c.priceSell) - Number(c.priceBuy);
      return acc;
    },
    { count: 0, revenue: 0, profit: 0 }
  );

  const totalFee = fee * totals.count;
  return NextResponse.json({
    monthly,
    totals: { ...totals, fee: totalFee },
    fixedFee: fee,
    bonus,
    payout: totalFee + bonus, // total de plată = taxă × vânzări + bonus
  });
}
