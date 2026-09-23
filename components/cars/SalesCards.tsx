"use client";

import Link from "next/link";
import { CarThumb } from "@/components/shared/CarThumb";
import { formatMoney } from "@/lib/utils";
import type { CarDTO } from "@/types";

/** Vânzările pe ecrane mici. Editarea în linie rămâne pe desktop. */
export function SalesCards({ cars }: { cars: CarDTO[] }) {
  return (
    <div className="space-y-3 lg:hidden">
      {cars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-400">
          Nicio vânzare găsită.
        </div>
      ) : cars.map((car) => {
        const profit = Number(car.priceSell) - Number(car.priceBuy);
        return (
          <Link key={car._id} href={`/dashboard/cars/${car._id}`}
            className="block rounded-xl border border-slate-200/80 bg-white p-3 shadow-card active:bg-brand-tint/40">
            <div className="flex gap-3">
              <CarThumb url={car.primaryPhoto} count={car.photoCount} className="h-16 w-20 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-900">
                  {car.brand} {car.model} <span className="font-normal text-slate-400">{car.year}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{car.clientName}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">Vândut: <b className="text-slate-900">{formatMoney(car.priceSell)}</b></span>
                  <span className="text-slate-500">Profit: <b className={profit >= 0 ? "text-emerald-700" : "text-red-600"}>{formatMoney(profit)}</b></span>
                </div>
                {car.soldByName && <p className="mt-1 truncate text-[11px] text-slate-400">Vânzător: {car.soldByName}</p>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
