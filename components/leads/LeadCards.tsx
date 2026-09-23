"use client";

import { Button } from "@/components/ui/Button";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadDTO, type LeadStatus } from "@/types";

/** Culorile etichetei de status — folosite și în tabelul de pe desktop. */
export const statusPill: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  viewing: "bg-amber-100 text-amber-700",
  negotiating: "bg-purple-100 text-purple-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-200 text-slate-500",
};

/** Clienții potențiali pe ecrane mici, cu telefonul apelabil direct. */
export function LeadCards({
  items,
  onStatus,
  onTasks,
  onEdit,
  onDelete,
}: {
  items: LeadDTO[];
  onStatus: (lead: LeadDTO, status: LeadStatus) => void;
  onTasks: (lead: LeadDTO) => void;
  onEdit: (lead: LeadDTO) => void;
  onDelete: (lead: LeadDTO) => void;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-400">
          Niciun client potențial.
        </div>
      ) : items.map((l) => (
        <div key={l._id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-slate-900">{l.clientName}</p>
              {l.clientPhone && (
                <a href={`tel:${l.clientPhone}`} className="font-mono text-xs text-brand">{l.clientPhone}</a>
              )}
            </div>
            <select
              aria-label="Status client potențial"
              value={l.status}
              onChange={(e) => onStatus(l, e.target.value as LeadStatus)}
              className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${statusPill[l.status]}`}
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{LEAD_SOURCE_LABELS[l.source]}</span>
            {[l.interestBrand, l.interestModel].filter(Boolean).length > 0 && (
              <span>Interes: <b className="text-slate-700">{[l.interestBrand, l.interestModel].filter(Boolean).join(" ")}</b></span>
            )}
            {l.budget ? <span>Buget: <b className="text-slate-700">{formatMoney(l.budget)}</b></span> : null}
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-400">
            {l.assignedToNames?.length ? l.assignedToNames.join(", ") : (l.assignedToName || "fără responsabil")} · {formatDateShort(l.createdAt)}
          </p>
          <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2.5">
            <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => onTasks(l)}>Sarcini</Button>
            <Button variant="ghost" size="sm" className="text-brand" onClick={() => onEdit(l)}>Editează</Button>
            <Button variant="ghost" size="sm" className="ml-auto text-red-600" onClick={() => onDelete(l)}>Șterge</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
