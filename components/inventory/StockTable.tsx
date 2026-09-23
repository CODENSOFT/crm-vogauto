"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/Icons";
import { Badge } from "@/components/ui/Table";
import { CarThumb } from "@/components/shared/CarThumb";
import { formatMoney } from "@/lib/utils";
import { STOCK_STATUS_LABELS, type InventoryDTO } from "@/types";

/** Stocul pe ecrane late: tabel cu toate coloanele. */
export function StockTable({
  items,
  prep,
  cols,
  onReady,
  onDelete,
}: {
  items: InventoryDTO[];
  prep: boolean;
  cols: string[];
  onReady: (item: InventoryDTO) => void;
  onDelete: (item: InventoryDTO) => void;
}) {
  const router = useRouter();

  return (
  <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card lg:block">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50/80">
        <tr>
          {cols.map((h, i) => (
            <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <tr><td colSpan={cols.length} className="px-4 py-12 text-center text-slate-400">
            {prep ? "Nicio mașină în pregătire." : "Nicio mașină în stoc."}
          </td></tr>
        ) : items.map((it) => (
          <tr
            key={it._id}
            onClick={() => router.push(`/dashboard/inventory/${it._id}`)}
            className="cursor-pointer transition-colors hover:bg-brand-tint/50"
          >
            <td className="px-3 py-2">
              <Link href={`/dashboard/inventory/${it._id}`} className="block" aria-label={`${it.brand} ${it.model}`}>
                <CarThumb url={it.primaryPhoto} count={it.photoCount} />
              </Link>
            </td>
            <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
              <Link href={`/dashboard/inventory/${it._id}`} className="hover:text-brand hover:underline">
                {it.brand} {it.model}
              </Link>
              {it.color ? <span className="text-slate-400"> · {it.color}</span> : null}
            </td>
            <td className="px-3 py-2.5 text-slate-600">{it.year}</td>
            <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500">{it.vin || "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{it.ownerName}</td>

            {prep ? (
              <>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-700">
                  {it.expensesTotal ? formatMoney(it.expensesTotal) : "—"}
                </td>
              </>
            ) : (
              <>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">{it.ownerPhone && it.ownerPhone !== "—" ? it.ownerPhone : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{it.purchaseCost ? formatMoney(it.purchaseCost) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                <td className={`whitespace-nowrap px-3 py-2.5 font-semibold ${(it.netMargin ?? it.markup) >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(it.netMargin ?? it.markup)}</td>
              </>
            )}

            <td className="px-3 py-2.5">
              <Badge color={it.status === "available" ? "green" : it.status === "preparing" ? "yellow" : "gray"}>
                {STOCK_STATUS_LABELS[it.status]}
              </Badge>
            </td>
            <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap px-3 py-2.5 text-right">
              {prep && (
                <Button variant="primary" size="sm" className="mr-2" onClick={() => onReady(it)}>
                  Gata de vânzare
                </Button>
              )}
              <button
                type="button"
                onClick={() => onDelete(it)}
                title="Șterge"
                aria-label={`Șterge ${it.brand} ${it.model}`}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
}
