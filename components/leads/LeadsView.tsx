"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { CarStockPicker } from "@/components/shared/CarStockPicker";
import { MultiUserPicker } from "@/components/shared/MultiUserPicker";
import { formatMoney, formatDateShort, formatDate } from "@/lib/utils";
import {
  LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, TASK_TYPE_LABELS, TASK_STATUS_LABELS,
  type LeadDTO, type LeadSource, type LeadStatus, type UserDTO, type TaskDTO,
} from "@/types";

const EMPTY = {
  clientName: "", clientPhone: "", source: "call" as LeadSource, interestBrand: "", interestModel: "",
  budget: "", inventoryId: "", carLabel: "", status: "new", assignedToIds: [] as string[], notes: "",
};

const statusPill: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  viewing: "bg-amber-100 text-amber-700",
  negotiating: "bg-purple-100 text-purple-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-200 text-slate-500",
};

export function LeadsView() {
  const [items, setItems] = useState<LeadDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sarcinile clientului (modal legat de lead).
  const [tasksLead, setTasksLead] = useState<LeadDTO | null>(null);
  const [leadTasks, setLeadTasks] = useState<TaskDTO[]>([]);
  const [ntTitle, setNtTitle] = useState("");
  const [ntType, setNtType] = useState("test_drive");
  const [ntDate, setNtDate] = useState("");
  const [ntSaving, setNtSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    const res = await fetch(`/api/leads?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.leads);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [status]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/users").then((r) => (r.ok ? r.json() : { users: [] })).then((d) => {
      if (Array.isArray(d.users)) setWorkers(d.users.filter((u: UserDTO) => u.isActive));
    }).catch(() => {});
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }
  function openEdit(l: LeadDTO) {
    setEditing(l);
    setForm({
      clientName: l.clientName, clientPhone: l.clientPhone ?? "", source: l.source,
      interestBrand: l.interestBrand ?? "", interestModel: l.interestModel ?? "",
      budget: String(l.budget ?? ""), inventoryId: l.inventoryId ?? "", carLabel: "",
      status: l.status, assignedToIds: l.assignedToIds ?? (l.assignedTo ? [l.assignedTo] : []), notes: l.notes ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.clientName.trim()) { toast.error("Introduceți numele clientului."); return; }
    setSaving(true);
    const url = editing ? `/api/leads/${editing._id}` : "/api/leads";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Client potențial actualizat" : "Client potențial adăugat");
    setFormOpen(false); load();
  }

  async function changeStatus(l: LeadDTO, newStatus: LeadStatus) {
    const res = await fetch(`/api/leads/${l._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === l._id ? data.lead : x)));
  }

  async function openTasks(l: LeadDTO) {
    setTasksLead(l);
    setLeadTasks([]);
    setNtTitle(l.interestBrand || l.interestModel ? `Vizionare ${[l.interestBrand, l.interestModel].filter(Boolean).join(" ")}` : `Vizionare client ${l.clientName}`);
    setNtType("test_drive");
    setNtDate("");
    const res = await fetch(`/api/tasks?leadId=${l._id}`);
    if (res.ok) { const d = await res.json(); setLeadTasks(d.tasks || []); }
  }

  async function addLeadTask() {
    if (!tasksLead || !ntTitle.trim()) { toast.error("Introduceți titlul."); return; }
    setNtSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ntTitle.trim(), type: ntType, dueDate: ntDate || undefined,
        leadId: tasksLead._id, inventoryId: tasksLead.inventoryId || undefined,
        carLabel: [tasksLead.interestBrand, tasksLead.interestModel].filter(Boolean).join(" ") || undefined,
        assignedToIds: tasksLead.assignedToIds ?? (tasksLead.assignedTo ? [tasksLead.assignedTo] : []),
        description: `Client: ${tasksLead.clientName}${tasksLead.clientPhone ? ` · ${tasksLead.clientPhone}` : ""}`,
      }),
    });
    const d = await res.json();
    setNtSaving(false);
    if (!res.ok) { toast.error(d.error || "Eroare."); return; }
    toast.success("Sarcină programată");
    setLeadTasks((t) => [d.task, ...t]);
    setNtTitle(""); setNtDate("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Client potențial șters"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clienți potențiali</h1>
          <p className="mt-1 text-sm text-slate-500">Cine a sunat, ce mașină vrea și în ce etapă e — de la primul contact până la vânzare.</p>
        </div>
        <Button onClick={openAdd}>Client potențial nou</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-3">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <>
        {/* Telefon / tabletă: carduri */}
        <div className="space-y-3 lg:hidden">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-400">Niciun client potențial.</div>
          ) : items.map((l) => (
            <div key={l._id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-slate-900">{l.clientName}</p>
                  {l.clientPhone && (
                    <a href={`tel:${l.clientPhone}`} className="font-mono text-xs text-brand">{l.clientPhone}</a>
                  )}
                </div>
                <select value={l.status} onChange={(e) => changeStatus(l, e.target.value as LeadStatus)}
                  className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${statusPill[l.status]}`}>
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
                <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => openTasks(l)}>Sarcini</Button>
                <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(l)}>Editează</Button>
                <Button variant="ghost" size="sm" className="ml-auto text-red-600" onClick={() => setDeleteTarget(l)}>Șterge</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: tabel */}
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
                    <select value={l.status} onChange={(e) => changeStatus(l, e.target.value as LeadStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${statusPill[l.status]}`}>
                      {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{l.assignedToNames?.length ? l.assignedToNames.join(", ") : (l.assignedToName || "—")}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <span className="mr-2 text-xs text-slate-400">{formatDateShort(l.createdAt)}</span>
                    <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => openTasks(l)}>Sarcini</Button>
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(l)}>Editează</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(l)}>Șterge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editează client potențial" : "Client potențial nou"}
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nume client *" value={form.clientName} onChange={(e) => setF("clientName", e.target.value)} />
          <Input label="Telefon" value={form.clientPhone} onChange={(e) => setF("clientPhone", e.target.value)} />
          <Select label="Sursă" value={form.source} onChange={(e) => setF("source", e.target.value)}>
            {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
            {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="Marcă dorită" value={form.interestBrand} onChange={(e) => setF("interestBrand", e.target.value)} />
          <Input label="Model dorit" value={form.interestModel} onChange={(e) => setF("interestModel", e.target.value)} />
          <Input label="Buget (€)" type="number" value={form.budget} onChange={(e) => setF("budget", e.target.value)} />
          <MultiUserPicker label="Responsabili" workers={workers}
            value={form.assignedToIds} onChange={(ids) => setForm((f) => ({ ...f, assignedToIds: ids }))} />
          <div className="sm:col-span-2">
            <CarStockPicker value={form.carLabel} inventoryId={form.inventoryId}
              onChange={(label, invId) => setForm((f) => ({ ...f, carLabel: label, inventoryId: invId }))} label="Mașina de interes (din stoc, opțional)" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Detalii discuție, preferințe..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere client potențial"
        message={`Sigur ștergeți clientul potențial „${deleteTarget?.clientName}"?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      {/* Sarcinile clientului (vizionări, follow-up) */}
      <Modal open={!!tasksLead} onClose={() => setTasksLead(null)} title={`Sarcini · ${tasksLead?.clientName ?? ""}`}
        footer={<Button variant="secondary" onClick={() => setTasksLead(null)}>Închide</Button>}>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Programează o sarcină</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Titlu" value={ntTitle} onChange={(e) => setNtTitle(e.target.value)} placeholder="ex: Vizionare BMW X5" />
              </div>
              <Select label="Tip" value={ntType} onChange={(e) => setNtType(e.target.value)}>
                {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data și ora</label>
                <input type="datetime-local" value={ntDate} onChange={(e) => setNtDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={addLeadTask} loading={ntSaving}>Adaugă sarcină</Button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sarcini existente</p>
            {leadTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Nicio sarcină pentru acest client.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {leadTasks.map((t) => (
                  <li key={t._id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500">{TASK_TYPE_LABELS[t.type]}{t.dueDate ? ` · ${formatDate(t.dueDate)}` : ""}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{TASK_STATUS_LABELS[t.status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
