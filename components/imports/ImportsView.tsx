"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { IMPORT_STAGE_LABELS, type ImportDTO, type ImportStage, type UserDTO } from "@/types";

const EMPTY = {
  brand: "", model: "", year: String(new Date().getFullYear()), vin: "", source: "", supplierName: "",
  stage: "purchased", purchasePrice: "", customsCost: "", otherCosts: "",
  responsibleId: "", expectedDate: "", arrivedDate: "", notes: "",
};

const stageColor = (s: ImportStage) =>
  s === "done" || s === "ready" ? "green" : s === "customs" ? "yellow" : "blue";
const dateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

export function ImportsView() {
  const [items, setItems] = useState<ImportDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ImportDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImportDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (stage) p.set("stage", stage);
    const res = await fetch(`/api/imports?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.imports);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [stage]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.users)) setWorkers(d.users.filter((u: UserDTO) => u.isActive));
    }).catch(() => {});
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const total = (Number(form.purchasePrice) || 0) + (Number(form.customsCost) || 0) + (Number(form.otherCosts) || 0);

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }
  function openEdit(im: ImportDTO) {
    setEditing(im);
    setForm({
      brand: im.brand, model: im.model, year: String(im.year ?? ""), vin: im.vin ?? "",
      source: im.source ?? "", supplierName: im.supplierName ?? "", stage: im.stage,
      purchasePrice: String(im.purchasePrice ?? ""), customsCost: String(im.customsCost ?? ""), otherCosts: String(im.otherCosts ?? ""),
      responsibleId: im.responsibleId ?? "", expectedDate: dateInput(im.expectedDate), arrivedDate: dateInput(im.arrivedDate),
      notes: im.notes ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.brand || !form.model) { toast.error("Marca și modelul sunt obligatorii."); return; }
    setSaving(true);
    const url = editing ? `/api/imports/${editing._id}` : "/api/imports";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, responsibleId: form.responsibleId || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Import actualizat" : "Import adăugat");
    setFormOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/imports/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Import șters"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import & devamare</h1>
          <p className="mt-1 text-sm text-slate-500">Mașini importate: etapă, costuri (achiziție, devamare), responsabil și date.</p>
        </div>
        <Button onClick={openAdd}>Import nou</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2">
        <Select label="Etapă" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(IMPORT_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Mașină", "An", "Proveniență", "Etapă", "Achiziție", "Devamare", "Cost total", "Responsabil", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Niciun import.</td></tr>
              ) : items.map((im) => (
                <tr key={im._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{im.brand} {im.model}</td>
                  <td className="px-3 py-2.5 text-slate-600">{im.year || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{im.source || "—"}</td>
                  <td className="px-3 py-2.5"><Badge color={stageColor(im.stage)}>{IMPORT_STAGE_LABELS[im.stage]}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatMoney(im.purchasePrice)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatMoney(im.customsCost)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-900">{formatMoney(im.totalCost)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{im.responsibleName || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(im)}>Editează</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(im)}>Șterge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editează importul" : "Import nou"}
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Marcă *" value={form.brand} onChange={(e) => setF("brand", e.target.value)} />
          <Input label="Model *" value={form.model} onChange={(e) => setF("model", e.target.value)} />
          <Input label="An" type="number" value={form.year} onChange={(e) => setF("year", e.target.value)} />
          <Input label="VIN" value={form.vin} onChange={(e) => setF("vin", e.target.value)} />
          <Input label="Proveniență (țară)" value={form.source} onChange={(e) => setF("source", e.target.value)} placeholder="ex: Germania" />
          <Input label="Furnizor" value={form.supplierName} onChange={(e) => setF("supplierName", e.target.value)} />
          <Select label="Etapă" value={form.stage} onChange={(e) => setF("stage", e.target.value)}>
            {Object.entries(IMPORT_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select label="Responsabil" value={form.responsibleId} onChange={(e) => setF("responsibleId", e.target.value)}>
            <option value="">— fără —</option>
            {workers.map((w) => <option key={w._id} value={w._id}>{w.fullName}</option>)}
          </Select>
          <Input label="Preț achiziție (€)" type="number" value={form.purchasePrice} onChange={(e) => setF("purchasePrice", e.target.value)} />
          <Input label="Cost devamare (€)" type="number" value={form.customsCost} onChange={(e) => setF("customsCost", e.target.value)} />
          <Input label="Alte costuri (€)" type="number" value={form.otherCosts} onChange={(e) => setF("otherCosts", e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Dată estimată sosire</label>
            <input type="date" value={form.expectedDate} onChange={(e) => setF("expectedDate", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Dată sosire</label>
            <input type="date" value={form.arrivedDate} onChange={(e) => setF("arrivedDate", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
          </div>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Cost total: <span className="font-semibold text-slate-900">{formatMoney(total)}</span>
            <span className="text-slate-400"> (achiziție + devamare + alte costuri)</span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere import"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model}?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
