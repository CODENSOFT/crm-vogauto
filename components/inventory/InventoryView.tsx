"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { InventoryFormModal } from "@/components/inventory/InventoryFormModal";
import { formatMoney } from "@/lib/utils";
import { STOCK_STATUS_LABELS, type InventoryDTO } from "@/types";

export function InventoryView() {
  const [items, setItems] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Implicit arătăm doar mașinile disponibile; vândutele se văd cu filtrul.
  const [status, setStatus] = useState("available");

  const [formOpen, setFormOpen] = useState(false);
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
          <p className="mt-1 text-sm text-slate-500">Deschide o mașină pentru poze, editare și istoric.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Adaugă mașină</Button>
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
                {["Foto", "Mașină", "An", "VIN", "Proprietar", "Telefon", "Preț client", "Preț vânzare", "Adaus", "Status", ""].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Nicio mașină în stoc.</td></tr>
              ) : items.map((it) => (
                <tr key={it._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/inventory/${it._id}`} className="block">
                      <div className="relative h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                        {it.primaryPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.primaryPhoto} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">fără</span>
                        )}
                        {(it.photoCount ?? 0) > 1 && (
                          <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[9px] text-white">{it.photoCount}</span>
                        )}
                      </div>
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
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">{it.ownerPhone && it.ownerPhone !== "—" ? it.ownerPhone : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{it.clientWantPrice ? formatMoney(it.clientWantPrice) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                  <td className={`whitespace-nowrap px-3 py-2.5 font-semibold ${it.markup >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(it.markup)}</td>
                  <td className="px-3 py-2.5"><Badge color={it.status === "available" ? "green" : "gray"}>{STOCK_STATUS_LABELS[it.status]}</Badge></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Link href={`/dashboard/inventory/${it._id}`} className="text-xs font-semibold text-brand hover:underline">Deschide</Link>
                    <Button variant="ghost" size="sm" className="ml-2 text-red-600" onClick={() => setDeleteTarget(it)}>Șterge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InventoryFormModal open={formOpen} editing={null} onClose={() => setFormOpen(false)} onSaved={load} />

      <ConfirmDialog open={!!deleteTarget} title="Ștergere mașină din stoc"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model}?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
