"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StockCards } from "@/components/inventory/StockCards";
import { StockSummary } from "@/components/inventory/StockSummary";
import { StockToolbar, type SortKey } from "@/components/inventory/StockToolbar";
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
  const [counts, setCounts] = useState({ preparing: 0, available: 0 });
  const [sort, setSort] = useState<SortKey>("recente");

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
    if (res.ok) {
      setItems(data.items);
      if (data.counts) setCounts(data.counts);
    } else toast.error(data.error || "Eroare.");
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

  // Sortarea se face aici, nu pe server: lista secțiunii e deja în pagină, iar
  // o cerere nouă la fiecare schimbare de ordine ar fi doar așteptare.
  const vizibile = [...items].sort((a, b) => {
    switch (sort) {
      case "pret-mare": return Number(b.sellPrice) - Number(a.sellPrice);
      case "pret-mic": return Number(a.sellPrice) - Number(b.sellPrice);
      case "adaus": return Number(b.netMargin ?? b.markup) - Number(a.netMargin ?? a.markup);
      case "marca": return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, "ro");
      default: return 0; // „recente" — ordinea venită de la server
    }
  });

  const cols = prep
    ? ["Foto", "Mașină", "An", "VIN", "Proprietar", "Preț vânzare", "Cheltuieli", "Status", ""]
    : ["Foto", "Mașină", "An", "VIN", "Proprietar", "Telefon", "Cost achiziție", "Preț vânzare", "Adaus net", "Status", ""];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-0.02em] text-ink">Stoc mașini</h1>
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
            className={`flex items-center rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? t.key === "preparing" ? "bg-amber-500 text-white shadow-sm" : "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
              tab === t.key ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      <StockSummary items={vizibile} prep={prep} />

      <StockToolbar search={search} setSearch={setSearch} sort={sort} setSort={setSort} total={vizibile.length} />

      {loading ? (
        /* Schelet, nu „Se încarcă...": pagina nu-și mai schimbă forma când
           sosesc datele, deci ochiul nu sare. */
        <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-100 py-3 last:border-0">
              <div className="skeleton h-11 w-14 rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-44" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton hidden h-3 w-20 sm:block" />
              <div className="skeleton hidden h-3 w-24 sm:block" />
            </div>
          ))}
        </div>
      ) : vizibile.length === 0 ? (
        /* Starea goală spune și ce se poate face, nu doar că e gol. */
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <p className="text-sm font-medium text-slate-600">
            {search
              ? `Nicio mașină nu se potrivește cu „${search}”.`
              : prep ? "Nicio mașină în pregătire." : "Nicio mașină în stoc."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {search
              ? "Încearcă alt cuvânt, sau golește căutarea."
              : prep
                ? "Aici intră mașinile care încă nu sunt gata de vânzare."
                : "Adaugă prima mașină ca să apară în vânzări și la publicare."}
          </p>
          <div className="mt-4">
            {search ? (
              <Button variant="secondary" onClick={() => setSearch("")}>Golește căutarea</Button>
            ) : (
              <Button onClick={() => setFormOpen(true)}>
                {prep ? "Adaugă mașină în pregătire" : "Adaugă mașină"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <StockCards items={vizibile} prep={prep} onReady={setReadyTarget} onDelete={setDeleteTarget} />
          <StockTable items={vizibile} prep={prep} cols={cols} onReady={setReadyTarget} onDelete={setDeleteTarget} />
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
