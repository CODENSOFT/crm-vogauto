"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StockCards } from "@/components/inventory/StockCards";
import { StockTable } from "@/components/inventory/StockTable";
import { InventoryFormModal } from "@/components/inventory/InventoryFormModal";
import { formatMoney } from "@/lib/utils";
import { type InventoryDTO } from "@/types";

type Tab = "preparing" | "available";

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "preparing", label: "În pregătire", hint: "Mașini care încă nu sunt gata de vânzare — aici se adună cheltuielile." },
  { key: "available", label: "În stoc", hint: "Mașini gata de vânzare — apar în formularul de vânzare și la publicare." },
];

export function InventoryView() {
  const [items, setItems] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("available");

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [readyTarget, setReadyTarget] = useState<InventoryDTO | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    p.set("status", tab);
    const res = await fetch(`/api/inventory?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [search, tab]);

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

  // Trece mașina din pregătire în stocul de vânzare.
  async function confirmReady() {
    if (!readyTarget) return;
    setMarking(true);
    const res = await fetch(`/api/inventory/${readyTarget._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "available" }),
    });
    const data = await res.json();
    setMarking(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Mașina a trecut în stoc — se poate vinde");
    setReadyTarget(null);
    load();
  }

  const prep = tab === "preparing";
  const cols = prep
    ? ["Foto", "Mașină", "An", "VIN", "Proprietar", "Preț vânzare", "Cheltuieli", "Status", ""]
    : ["Foto", "Mașină", "An", "VIN", "Proprietar", "Telefon", "Cost achiziție", "Preț vânzare", "Adaus net", "Status", ""];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stoc mașini</h1>
          <p className="mt-1 text-sm text-slate-500">{TABS.find((t) => t.key === tab)?.hint}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          {prep ? "Adaugă mașină în pregătire" : "Adaugă mașină"}
        </Button>
      </div>

      {/* Secțiuni */}
      <div className="mb-4 flex w-fit rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? t.key === "preparing" ? "bg-amber-500 text-white shadow-sm" : "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:max-w-sm">
        <Input label="Căutare" placeholder="Marcă, model, VIN, proprietar" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-400">
          {prep ? "Nicio mașină în pregătire." : "Nicio mașină în stoc."}
        </div>
      ) : (
        <>
        <StockCards
          items={items}
          prep={prep}
          onReady={setReadyTarget}
          onDelete={setDeleteTarget}
        />

        <StockTable items={items} prep={prep} cols={cols} onReady={setReadyTarget} onDelete={setDeleteTarget} />
        </>
      )}

      <InventoryFormModal
        open={formOpen}
        editing={null}
        defaultStatus={prep ? "preparing" : "available"}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog open={!!deleteTarget} title="Ștergere mașină din stoc"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model}?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      <ConfirmDialog open={!!readyTarget} title="Mașină gata de vânzare"
        message={`${readyTarget?.brand} ${readyTarget?.model} trece în stocul de vânzare${readyTarget?.expensesTotal ? ` (cheltuieli înregistrate: ${formatMoney(readyTarget.expensesTotal)})` : ""}. Va putea fi vândută și publicată.`}
        confirmLabel="Trece în stoc" loading={marking} onConfirm={confirmReady} onCancel={() => setReadyTarget(null)} />
    </div>
  );
}
