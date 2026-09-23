"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { CarThumb } from "@/components/shared/CarThumb";
import { formatMoney } from "@/lib/utils";
import { STOCK_STATUS_LABELS, type InventoryDTO } from "@/types";

/** Stocul pe ecrane mici: un card per mașină, în locul tabelului. */
export function StockCards({
  items,
  prep,
  onReady,
  onDelete,
}: {
  items: InventoryDTO[];
  /** Secțiunea „În pregătire" arată cheltuielile, nu adaosul. */
  prep: boolean;
  onReady: (item: InventoryDTO) => void;
  onDelete: (item: InventoryDTO) => void;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.map((it) => (
        <div key={it._id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-card">
          <div className="flex gap-3">
            <Link href={`/dashboard/inventory/${it._id}`} className="shrink-0" aria-label={`${it.brand} ${it.model}`}>
              <CarThumb url={it.primaryPhoto} count={it.photoCount} className="h-16 w-20 rounded-lg" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/dashboard/inventory/${it._id}`} className="truncate text-[15px] font-semibold text-slate-900">
                  {it.brand} {it.model} <span className="font-normal text-slate-400">{it.year}</span>
                </Link>
                <Badge color={it.status === "available" ? "green" : "yellow"}>{STOCK_STATUS_LABELS[it.status]}</Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {it.ownerName}{it.color ? ` · ${it.color}` : ""}{it.engine ? ` · ${it.engine}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-slate-500">Preț: <b className="text-slate-900">{formatMoney(it.sellPrice)}</b></span>
                {prep ? (
                  it.expensesTotal ? <span className="text-slate-500">Cheltuieli: <b className="text-amber-700">{formatMoney(it.expensesTotal)}</b></span> : null
                ) : (
                  <span className="text-slate-500">Adaus: <b className={(it.netMargin ?? it.markup) >= 0 ? "text-emerald-700" : "text-red-600"}>{formatMoney(it.netMargin ?? it.markup)}</b></span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
            {prep && <Button size="sm" onClick={() => onReady(it)}>Gata de vânzare</Button>}
            <Link href={`/dashboard/inventory/${it._id}`} className="text-xs font-semibold text-brand">Deschide</Link>
            <Button variant="ghost" size="sm" className="ml-auto text-red-600" onClick={() => onDelete(it)}>Șterge</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
