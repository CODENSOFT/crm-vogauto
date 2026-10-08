"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CarThumb } from "@/components/shared/CarThumb";
import { IconEye } from "@/components/ui/Icons";
import { formatMoney, formatDateShort } from "@/lib/utils";
import type { CarDTO } from "@/types";

const HEADERS: [string, string][] = [
  ["", "#"], ["", "Foto"], ["clientName", "Client"], ["", "Telefon"], ["brand", "Marcă"], ["", "Model"], ["year", "An"],
  ["", "VIN"], ["", "Culoare"], ["priceBuy", "Preț cump."], ["priceSell", "Preț vânz."], ["", "Profit"],
  ["", "Plată"], ["", "Vândut de"], ["saleDate", "Data"], ["", "Status"], ["", "Note"], ["", ""],
];

/** Tabelul de vânzări cu editare în linie (doar pe ecrane late). */
export function SalesTable({
  cars, page, sortBy, sortDir, onToggleSort, onCarsChange, onDelete,
}: {
  cars: CarDTO[];
  page: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  onToggleSort: (col: string) => void;
  onCarsChange: React.Dispatch<React.SetStateAction<CarDTO[]>>;
  onDelete: (car: CarDTO) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const sortInd = (c: string) => (sortBy === c ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  function startEdit(car: CarDTO, field: keyof CarDTO) { setEditing(`${car._id}:${field}`); const v = car[field]; setEditValue(v == null ? "" : String(v)); }
  function startEditProfit(car: CarDTO) { setEditing(`${car._id}:profit`); setEditValue(String(Number(car.priceSell) - Number(car.priceBuy))); }

  async function patch(car: CarDTO, payload: Record<string, unknown>, okMsg = "Salvat") {
    const res = await fetch(`/api/cars/${car._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    if (data.car) { toast.success(okMsg); onCarsChange((prev) => prev.map((c) => c._id === car._id ? { ...c, ...data.car } : c)); }
  }
  async function saveField(car: CarDTO, field: string) { setEditing(null); await patch(car, { [field]: editValue }); }
  async function saveProfit(car: CarDTO) { setEditing(null); await patch(car, { profit: editValue }, "Profit actualizat"); }

  async function revealPhone(car: CarDTO) {
    if (revealed[car._id]) return;
    const res = await fetch(`/api/cars/${car._id}/reveal-phone`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setRevealed((r) => ({ ...r, [car._id]: data.phone }));
  }

  function Cell({ car, field, type = "text", display }: { car: CarDTO; field: keyof CarDTO; type?: string; display: React.ReactNode }) {
    const id = `${car._id}:${field}`;
    if (editing === id) return (
      <input ref={(el) => el?.focus()} type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => saveField(car, field)}
        onKeyDown={(e) => { if (e.key === "Enter") saveField(car, field); if (e.key === "Escape") setEditing(null); }}
        className="w-24 rounded border border-brand px-1 py-0.5 text-sm outline-none" />
    );
    return (
      <button
        type="button"
        aria-label="Editează valoarea"
        onClick={() => startEdit(car, field)}
        className="block min-h-[1.25rem] w-full cursor-pointer rounded px-1 text-left hover:bg-blue-50"
        title="Click pentru editare"
      >{display}</button>
    );
  }

  return (
  <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card lg:block">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50/80">
        <tr>{HEADERS.map(([col, lbl]: [string, string], i: number) => (
          <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {col ? (
              <button type="button" onClick={() => onToggleSort(col)} className="select-none uppercase tracking-wider hover:text-brand">
                {lbl}{sortInd(col)}
              </button>
            ) : lbl}
          </th>
        ))}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {cars.length === 0 ? (
          <tr><td colSpan={HEADERS.length} className="px-4 py-12 text-center text-slate-400">Nicio vânzare găsită.</td></tr>
        ) : cars.map((car, idx) => {
          const profit = Number(car.priceSell) - Number(car.priceBuy);
          return (
            <tr key={car._id} className="transition-colors hover:bg-brand-tint/50">
              <td className="px-3 py-2 text-slate-400">{(page - 1) * 20 + idx + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/dashboard/cars/${car._id}`} className="block" title="Vezi detalii" aria-label={`${car.brand} ${car.model}`}>
                  <CarThumb url={car.primaryPhoto} count={car.photoCount} className="h-10 w-14" />
                </Link>
              </td>
              <td className="px-3 py-2"><Cell car={car} field="clientName" display={car.clientName} /></td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {revealed[car._id] ? revealed[car._id] : (
                  <button onClick={() => revealPhone(car)} className="inline-flex items-center gap-1 text-slate-600 hover:text-brand" title="Click pentru a dezvălui" aria-label="Arată telefonul">
                    {car.clientPhone} <IconEye className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
              <td className="px-3 py-2"><Cell car={car} field="brand" display={car.brand} /></td>
              <td className="px-3 py-2"><Cell car={car} field="model" display={car.model} /></td>
              <td className="px-3 py-2"><Cell car={car} field="year" type="number" display={car.year} /></td>
              <td className="px-3 py-2 font-mono text-xs"><Cell car={car} field="vin" display={car.vin} /></td>
              <td className="px-3 py-2"><Cell car={car} field="color" display={car.color ?? "—"} /></td>
              <td className="px-3 py-2"><Cell car={car} field="priceBuy" type="number" display={formatMoney(car.priceBuy)} /></td>
              <td className="px-3 py-2"><Cell car={car} field="priceSell" type="number" display={formatMoney(car.priceSell)} /></td>
              <td className="whitespace-nowrap px-3 py-2">
                {editing === `${car._id}:profit` ? (
                  <input ref={(el) => el?.focus()} type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveProfit(car)} onKeyDown={(e) => { if (e.key === "Enter") saveProfit(car); if (e.key === "Escape") setEditing(null); }}
                    className="w-24 rounded border border-brand px-1 py-0.5 text-sm outline-none" />
                ) : (
                  <button
                    type="button"
                    aria-label="Editează profitul"
                    onClick={() => startEditProfit(car)}
                    className={`block w-full cursor-pointer rounded px-1 text-left font-medium hover:bg-blue-50 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    title="Click pentru editarea profitului"
                  >{formatMoney(profit)}</button>
                )}
              </td>
              <td className="px-3 py-2">
                <select aria-label="Metodă de plată" value={car.paymentMethod} onChange={(e) => patch(car, { paymentMethod: e.target.value })} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300">
                  <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
                </select>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{car.soldByName ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2">{formatDateShort(car.saleDate)}</td>
              <td className="px-3 py-2">
                <select aria-label="Status vânzare" value={car.status} onChange={(e) => patch(car, { status: e.target.value })} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300">
                  <option value="available">Disponibilă</option><option value="reserved">Rezervată</option><option value="sold">Vândută</option>
                </select>
              </td>
              <td className="max-w-[10rem] px-3 py-2"><Cell car={car} field="notes" display={<span className="block truncate">{car.notes ?? "—"}</span>} /></td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => onDelete(car)}>Șterge</Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
  );
}
