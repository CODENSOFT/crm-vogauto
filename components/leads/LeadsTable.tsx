"use client";

import { Button } from "@/components/ui/Button";
import { statusPill } from "@/components/leads/LeadCards";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadDTO, type LeadStatus } from "@/types";

/** Clienții potențiali pe ecrane late: tabel cu toate coloanele. */
export function LeadsTable({
  items, onStatus, onTasks, onEdit, onDelete,
}: {
  items: LeadDTO[];
  onStatus: (lead: LeadDTO, status: LeadStatus) => void;
  onTasks: (lead: LeadDTO) => void;
  onEdit: (lead: LeadDTO) => void;
  onDelete: (lead: LeadDTO) => void;
}) {
  return (
  <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card lg:block">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50/80">
        <tr>
          {["Client", "Telefon", "Sursă", "Interes", "Buget", "Status", "Responsabil", ""].map((h, i) => (
            <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Niciun client potențial.</td></tr>
        ) : items.map((l) => (
          <tr key={l._id} className="transition-colors hover:bg-brand-tint/50">
            <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{l.clientName}</td>
            <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">{l.clientPhone || "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{LEAD_SOURCE_LABELS[l.source]}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{[l.interestBrand, l.interestModel].filter(Boolean).join(" ") || "—"}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{l.budget ? formatMoney(l.budget) : "—"}</td>
            <td className="px-3 py-2.5">
              <select value={l.status} onChange={(e) => onStatus(l, e.target.value as LeadStatus)}
                className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${statusPill[l.status]}`}>
                {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </td>
            <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{l.assignedToNames?.length ? l.assignedToNames.join(", ") : (l.assignedToName || "—")}</td>
            <td className="whitespace-nowrap px-3 py-2.5 text-right">
              <span className="mr-2 text-xs text-slate-400">{formatDateShort(l.createdAt)}</span>
              <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => onTasks(l)}>Sarcini</Button>
              <Button variant="ghost" size="sm" className="text-brand" onClick={() => onEdit(l)}>Editează</Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(l)}>Șterge</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
}
