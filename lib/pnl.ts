import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cars, users } from "@/lib/schema";

export interface CarPnl {
  priceSell: number;
  priceBuy: number;
  gross: number;          // preț vânzare − preț cumpărare
  commission: number;     // taxa fixă a vânzătorului
  net: number;            // profit net = preț vânzare − preț cumpărare − taxă
}

// Calculează profitul real al unei vânzări (mașină din tabelul `cars`).
export async function computeCarPnl(carId: string): Promise<CarPnl | null> {
  const [car] = await db.select().from(cars).where(and(eq(cars.id, carId), eq(cars.isDeleted, false))).limit(1);
  if (!car) return null;

  const priceSell = Number(car.priceSell);
  const priceBuy = Number(car.priceBuy);
  const gross = priceSell - priceBuy;

  // Taxa fixă din profilul vânzătorului.
  let commission = 0;
  if (car.soldBy) {
    const [u] = await db.select({ fixedFee: users.fixedFee }).from(users).where(eq(users.id, car.soldBy)).limit(1);
    if (u) commission = Number(u.fixedFee ?? 0);
  }

  return { priceSell, priceBuy, gross, commission, net: gross - commission };
}
