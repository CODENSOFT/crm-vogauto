"use client";

import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

// Selector de mașină: scrii și îți propune mașinile potrivite din stocul
// disponibil, sau alegi din listă; dacă scrii ceva ce nu-i în stoc rămâne text
// liber. Folosit peste tot unde se indică o mașină (Sarcini, Lucrări, ...).
export function CarStockPicker({
  value,
  inventoryId,
  onChange,
  label = "Mașină din stoc (opțional)",
  placeholder = "Scrie marca/modelul sau alege din stocul disponibil...",
}: {
  value: string;
  inventoryId?: string;
  onChange: (carLabel: string, inventoryId: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [stock, setStock] = useState<InventoryDTO[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/inventory?status=available")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.items)) setStock(d.items); })
      .catch(() => {});
  }, []);

  const q = value.trim().toLowerCase();
  const matches = (q
    ? stock.filter((s) => `${s.brand} ${s.model} ${s.year} ${s.vin ?? ""}`.toLowerCase().includes(q))
    : stock
  ).slice(0, 8);

  return (
    <div className="relative">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
        {inventoryId && <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">din stoc</span>}
      </label>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value, ""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-elevated">
          {matches.map((s) => (
            <button
              type="button"
              key={s._id}
              onMouseDown={(e) => { e.preventDefault(); onChange(`${s.brand} ${s.model} ${s.year}`, s._id); setOpen(false); }}
              className="flex w-full items-center gap-2.5 border-b border-slate-50 px-3 py-2 text-left last:border-0 hover:bg-brand-tint/50"
            >
              <span className="h-8 w-11 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                {s.primaryPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.primaryPhoto} alt="" className="h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 text-sm font-medium text-slate-800">{s.brand} {s.model} <span className="text-slate-400">{s.year}</span></span>
              <span className="ml-auto whitespace-nowrap text-xs text-slate-500">{formatMoney(s.sellPrice)}</span>
            </button>
          ))}
        </div>
      )}
      {stock.length === 0 && (
        <p className="mt-1 text-xs text-slate-400">Nicio mașină disponibilă în stoc — poți scrie manual.</p>
      )}
    </div>
  );
}
