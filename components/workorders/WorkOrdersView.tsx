"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { CarStockPicker } from "@/components/shared/CarStockPicker";
import { MultiUserPicker } from "@/components/shared/MultiUserPicker";
import { InlineEdit, InlinePill } from "@/components/shared/Inline";
import { formatMoney, formatDateShort } from "@/lib/utils";
import {
  WORK_TYPE_LABELS, WORK_STATUS_LABELS,
  type WorkOrderDTO, type WorkType, type WorkStatus, type UserDTO,
} from "@/types";

const EMPTY = {
  type: "service" as WorkType, carLabel: "", inventoryId: "", responsibleIds: [] as string[], status: "pending",
  cost: "", dateIn: "", dateOut: "", notes: "",
};

const statusPill: Record<WorkStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};
const STATUS_OPTS = Object.entries(WORK_STATUS_LABELS) as [string, string][];
const dateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

export function WorkOrdersView() {
  const [items, setItems] = useState<WorkOrderDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrderDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    const res = await fetch(`/api/work-orders?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.workOrders);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [type, status]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.users)) setWorkers(d.users.filter((u: UserDTO) => u.isActive));
    }).catch(() => {});
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }
  function openEdit(w: WorkOrderDTO) {
    setEditing(w);
    setForm({
      type: w.type, carLabel: w.carLabel ?? "", inventoryId: w.inventoryId ?? "", responsibleIds: w.responsibleIds ?? (w.responsibleId ? [w.responsibleId] : []),
      status: w.status, cost: String(w.cost ?? ""), dateIn: dateInput(w.dateIn), dateOut: dateInput(w.dateOut),
      notes: w.notes ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/work-orders/${editing._id}` : "/api/work-orders";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Lucrare actualizată" : "Lucrare adăugată");
    setFormOpen(false); load();
  }

  // Editare rapidă direct în tabel (fără modal).
  async function patch(w: WorkOrderDTO, payload: Record<string, unknown>) {
    const res = await fetch(`/api/work-orders/${w._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === w._id ? data.workOrder : x)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/work-orders/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Lucrare ștearsă"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lucrări</h1>
          <p className="mt-1 text-sm text-slate-500">Service, spălătorie și detailing — cu responsabil, cost și status.</p>
        </div>
        <Button onClick={openAdd}>Lucrare nouă</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2">
        <Select label="Tip" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(WORK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(WORK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Tip", "Mașină", "Responsabil", "Status", "Cost", "Intrare", "Ieșire", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Nicio lucrare.</td></tr>
              ) : items.map((w) => (
                <tr key={w._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{WORK_TYPE_LABELS[w.type]}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{w.carLabel || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{w.responsibleNames?.length ? w.responsibleNames.join(", ") : (w.responsibleName || "—")}</td>
                  <td className="px-3 py-2.5">
                    <InlinePill value={w.status} options={STATUS_OPTS} className={statusPill[w.status]} onChange={(v) => patch(w, { status: v })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                    <InlineEdit type="number" width="w-24" inputValue={String(w.cost ?? "")} display={formatMoney(w.cost)} onSave={(v) => patch(w, { cost: v })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                    <InlineEdit type="date" inputValue={dateInput(w.dateIn)} display={w.dateIn ? formatDateShort(w.dateIn) : "—"} onSave={(v) => patch(w, { dateIn: v || null })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                    <InlineEdit type="date" inputValue={dateInput(w.dateOut)} display={w.dateOut ? formatDateShort(w.dateOut) : "—"} onSave={(v) => patch(w, { dateOut: v || null })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(w)}>Editează</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(w)}>Șterge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">Click pe status, cost sau date pentru editare rapidă — fără să deschizi „Editează”.</p>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editează lucrarea" : "Lucrare nouă"}
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Tip" value={form.type} onChange={(e) => setF("type", e.target.value)}>
            {Object.entries(WORK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
            {Object.entries(WORK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <div className="sm:col-span-2">
            <CarStockPicker value={form.carLabel} inventoryId={form.inventoryId}
              onChange={(label, invId) => setForm((f) => ({ ...f, carLabel: label, inventoryId: invId }))} label="Mașină" />
          </div>
          <MultiUserPicker label="Responsabili" workers={workers}
            value={form.responsibleIds} onChange={(ids) => setForm((f) => ({ ...f, responsibleIds: ids }))} />
          <Input label="Cost (€)" type="number" value={form.cost} onChange={(e) => setF("cost", e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data intrare</label>
            <input type="date" value={form.dateIn} onChange={(e) => setF("dateIn", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data ieșire</label>
            <input type="date" value={form.dateOut} onChange={(e) => setF("dateOut", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere lucrare"
        message={`Sigur ștergeți lucrarea (${deleteTarget ? WORK_TYPE_LABELS[deleteTarget.type] : ""})?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
