"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { formatMoney } from "@/lib/utils";
import { STOCK_STATUS_LABELS, type InventoryDTO } from "@/types";

const EMPTY = {
  brand: "", model: "", year: String(new Date().getFullYear()), vin: "", color: "",
  ownerName: "", ownerPhone: "", clientWantPrice: "", sellPrice: "", status: "available", notes: "",
};

export function InventoryView() {
  const [items, setItems] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<InventoryDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    const res = await fetch(`/api/inventory?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [search, status]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }
  function openEdit(it: InventoryDTO) {
    setEditing(it);
    setForm({
      brand: it.brand, model: it.model, year: String(it.year), vin: it.vin ?? "", color: it.color ?? "",
      ownerName: it.ownerName, ownerPhone: it.ownerPhone,
      clientWantPrice: String(it.clientWantPrice ?? ""), sellPrice: String(it.sellPrice ?? ""),
      status: it.status, notes: it.notes ?? "",
    });
    setFormOpen(true);
  }

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const markup = (Number(form.sellPrice) || 0) - (Number(form.clientWantPrice) || 0);

  async function save() {
    if (!form.brand || !form.model || !form.year || !form.ownerName || !form.ownerPhone || !form.sellPrice) {
      toast.error("Completați câmpurile obligatorii."); return;
    }
    setSaving(true);
    const url = editing ? `/api/inventory/${editing._id}` : "/api/inventory";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Mașină actualizată" : "Mașină adăugată în stoc");
    setFormOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/inventory/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Mașină ștearsă din stoc"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stoc mașini</h1>
          <p className="mt-1 text-sm text-slate-500">Mașinile aflate la realizare: proprietar, prețul cerut și adaosul parcării.</p>
        </div>
        <Button onClick={openAdd}>Adaugă mașină</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-3">
        <Input label="Căutare" placeholder="Marcă, model, VIN, proprietar" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          <option value="available">Disponibile</option>
          <option value="sold">Vândute</option>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Mașină", "An", "VIN", "Proprietar", "Telefon", "Preț client", "Preț vânzare", "Adaus", "Status", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">Nicio mașină în stoc.</td></tr>
              ) : items.map((it) => (
                <tr key={it._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{it.brand} {it.model}{it.color ? <span className="text-slate-400"> · {it.color}</span> : null}</td>
                  <td className="px-3 py-2.5 text-slate-600">{it.year}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500">{it.vin || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{it.ownerName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">{it.ownerPhone}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatMoney(it.clientWantPrice)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                  <td className={`whitespace-nowrap px-3 py-2.5 font-semibold ${it.markup >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(it.markup)}</td>
                  <td className="px-3 py-2.5"><Badge color={it.status === "available" ? "green" : "gray"}>{STOCK_STATUS_LABELS[it.status]}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(it)}>Editează</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(it)}>Șterge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editează mașina" : "Adaugă mașină în stoc"}
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Marcă *" value={form.brand} onChange={(e) => setF("brand", e.target.value)} />
          <Input label="Model *" value={form.model} onChange={(e) => setF("model", e.target.value)} />
          <Input label="An *" type="number" value={form.year} onChange={(e) => setF("year", e.target.value)} />
          <Input label="VIN" value={form.vin} onChange={(e) => setF("vin", e.target.value)} />
          <Input label="Culoare" value={form.color} onChange={(e) => setF("color", e.target.value)} />
          <Input label="Proprietar *" value={form.ownerName} onChange={(e) => setF("ownerName", e.target.value)} />
          <Input label="Telefon proprietar *" value={form.ownerPhone} onChange={(e) => setF("ownerPhone", e.target.value)} />
          <Input label="Preț cerut de client (€)" type="number" value={form.clientWantPrice} onChange={(e) => setF("clientWantPrice", e.target.value)} />
          <Input label="Preț de vânzare (€) *" type="number" value={form.sellPrice} onChange={(e) => setF("sellPrice", e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
            <option value="available">Disponibilă</option>
            <option value="sold">Vândută</option>
          </Select>
          <div className="sm:col-span-2">
            <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
          </div>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Adaus parcare: <span className={`font-semibold ${markup >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(markup)}</span>
            <span className="text-slate-400"> (preț vânzare − preț client)</span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere mașină din stoc"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model}?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
