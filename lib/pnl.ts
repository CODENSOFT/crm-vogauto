import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, inventory, inventoryExpenses, users } from "@/lib/schema";

export interface CarPnl {
  priceSell: number;
  priceBuy: number;
  gross: number;          // preț vânzare − preț cumpărare
  expenses: { label: string; amount: number }[];
  expensesTotal: number;  // cheltuieli suportate cât a fost în pregătire
  commission: number;     // taxa fixă a vânzătorului
  net: number;            // profit net = brut − taxă − cheltuieli
}

// Calculează profitul real al unei vânzări (mașină din tabelul `cars`).
export async function computeCarPnl(carId: string): Promise<CarPnl | null> {
  const [car] = await db.select().from(cars).where(and(eq(cars.id, carId), eq(cars.isDeleted, false))).limit(1);
  if (!car) return null;

  const priceSell = Number(car.priceSell);
  const priceBuy = Number(car.priceBuy);
  const gross = priceSell - priceBuy;

  // Cheltuielile se leagă prin mașina din stoc care a generat vânzarea.
  const [inv] = await db.select({ id: inventory.id }).from(inventory).where(eq(inventory.saleId, carId)).limit(1);
  const expRows = inv
    ? await db
        .select({ label: inventoryExpenses.label, amount: inventoryExpenses.amount })
        .from(inventoryExpenses)
        .where(eq(inventoryExpenses.inventoryId, inv.id))
    : [];
  const expenses = expRows.map((e) => ({ label: e.label, amount: Number(e.amount) }));
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Taxa fixă din profilul vânzătorului.
  let commission = 0;
  if (car.soldBy) {
    const [u] = await db.select({ fixedFee: users.fixedFee }).from(users).where(eq(users.id, car.soldBy)).limit(1);
    if (u) commission = Number(u.fixedFee ?? 0);
  }

  return { priceSell, priceBuy, gross, expenses, expensesTotal, commission, net: gross - commission - expensesTotal };
}
