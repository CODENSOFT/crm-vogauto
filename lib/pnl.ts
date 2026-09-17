import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, inventory, workOrders, users } from "@/lib/schema";

export interface CarPnl {
  priceSell: number;
  priceBuy: number;
  gross: number;          // preț vânzare − preț cumpărare
  workOrders: { type: string; cost: number }[];
  workCost: number;       // total lucrări (service/spălat/detailing)
  commission: number;     // comisionul vânzătorului (taxa fixă)
  net: number;            // profit net = gross − lucrări − comision
  importCost?: number;    // informativ (dacă mașina provine din import, după VIN)
}

// Calculează P&L-ul real al unei vânzări (mașină din tabelul `cars`).
export async function computeCarPnl(carId: string): Promise<CarPnl | null> {
  const [car] = await db.select().from(cars).where(and(eq(cars.id, carId), eq(cars.isDeleted, false))).limit(1);
  if (!car) return null;

  const priceSell = Number(car.priceSell);
  const priceBuy = Number(car.priceBuy);
  const gross = priceSell - priceBuy;

  // Mașina din stoc corespunzătoare (dacă vânzarea a venit din stoc).
  const [inv] = await db.select().from(inventory).where(eq(inventory.saleId, carId)).limit(1);

  // Lucrări legate: prin inventarul vândut sau direct de mașina vândută.
  const woConds = [eq(workOrders.isDeleted, false)];
  const link = inv
    ? or(eq(workOrders.inventoryId, inv.id), eq(workOrders.carId, carId))
    : eq(workOrders.carId, carId);
  const wos = await db.select({ type: workOrders.type, cost: workOrders.cost }).from(workOrders).where(and(...woConds, link!));
  const workList = wos.map((w) => ({ type: w.type, cost: Number(w.cost) }));
  const workCost = workList.reduce((s, w) => s + w.cost, 0);

  // Comisionul vânzătorului = taxa fixă din profilul lui.
  let commission = 0;
  if (car.soldBy) {
    const [u] = await db.select({ fixedFee: users.fixedFee }).from(users).where(eq(users.id, car.soldBy)).limit(1);
    if (u) commission = Number(u.fixedFee ?? 0);
  }

  const net = gross - workCost - commission;

  return { priceSell, priceBuy, gross, workOrders: workList, workCost, commission, net };
}
