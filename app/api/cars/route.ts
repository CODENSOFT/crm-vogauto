import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import User from "@/models/User";
import { requireSession, requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { maskPhone, escapeRegex } from "@/lib/utils";

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
  const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;

  await connectDB();

  const query: Record<string, unknown> = { isDeleted: false };
  if (brand) query.brand = { $regex: escapeRegex(brand), $options: "i" };
  if (payment) query.paymentMethod = payment;
  if (status) query.status = status;
  if (worker) query.soldByName = { $regex: escapeRegex(worker), $options: "i" };
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo + "T23:59:59");
    query.saleDate = range;
  }
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { clientName: { $regex: safe, $options: "i" } },
      { clientPhone: { $regex: safe, $options: "i" } },
      { vin: { $regex: safe, $options: "i" } },
    ];
  }

  const allowed = ["saleDate", "brand", "model", "year", "priceSell", "priceBuy", "clientName"];
  const sortField = allowed.includes(sortBy) ? sortBy : "saleDate";

  const total = await Car.countDocuments(query);
  const cars = await Car.find(query)
    .sort({ [sortField]: sortDir })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const data = cars.map((c) => ({
    ...c,
    _id: String(c._id),
    soldBy: String(c.soldBy),
    clientPhone: maskPhone(c.clientPhone),
  }));

  return NextResponse.json({ cars: data, total, page, pageSize });
}

// POST /api/cars — admin ȘI worker.
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const {
    clientName, clientPhone, brand, model, year, vin, color,
    priceBuy, priceSell, profit, paymentMethod, saleDate, status, notes, soldBy,
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

  await connectDB();

  // Vânzătorul: adminul poate alege; implicit el însuși.
  let soldById = user.id;
  let soldByName = user.fullName;
  if (isAdmin && soldBy && soldBy !== user.id) {
    const seller = await User.findById(soldBy).select("fullName").lean();
    if (seller) { soldById = soldBy; soldByName = seller.fullName; }
  }

  try {
    const car = await Car.create({
      clientName, clientPhone, brand, model, year: Number(year),
      vin: String(vin).trim(), color: color || undefined,
      priceBuy: buy, priceSell: sell,
      paymentMethod: paymentMethod || "cash",
      status: isAdmin ? status || "sold" : "sold",
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      soldBy: soldById, soldByName, notes: notes || undefined,
    });

    await logAction({
      userId: user.id, userName: user.fullName, action: "CREATE_SALE",
      details: { carId: String(car._id), brand, model, vin, priceSell: sell, profit: sell - buy },
      request,
      coords: coordsOf(user),
    });

    if (!isAdmin) return NextResponse.json({ ok: true }, { status: 201 });
    return NextResponse.json({ car: { ...car.toObject(), _id: String(car._id) } }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: number };
    return NextResponse.json({ error: e.code === 11000 ? "VIN deja existent." : "Eroare la salvare." }, { status: 400 });
  }
}
