"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Pagination } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { AddSaleModal } from "@/components/cars/AddSaleModal";
import { SalesCards } from "@/components/cars/SalesCards";
import { SalesTable } from "@/components/cars/SalesTable";
import { IconDownload } from "@/components/ui/Icons";
import { type CarDTO, type InventoryDTO } from "@/types";

const EMPTY_FILTERS = { search: "", brand: "", worker: "", payment: "", status: "", dateFrom: "", dateTo: "" };
const NEW_SALE = {
  clientName: "", clientPhone: "", brand: "", model: "", year: String(new Date().getFullYear()),
  vin: "", color: "", engine: "", priceBuy: "", priceSell: "", profit: "", paymentMethod: "cash", status: "sold",
  saleDate: new Date().toISOString().slice(0, 10), notes: "", soldBy: "", inventoryId: "",
};

export function CarsTable() {
  const [cars, setCars] = useState<CarDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [sortBy, setSortBy] = useState("saleDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [workers, setWorkers] = useState<{ _id: string; fullName: string }[]>([]);


  const [addOpen, setAddOpen] = useState(false);
  const [newSale, setNewSale] = useState({ ...NEW_SALE });
  const [savingNew, setSavingNew] = useState(false);
  const [stock, setStock] = useState<InventoryDTO[]>([]);
  const [stockQuery, setStockQuery] = useState(""); // textul din selectorul de stoc

  const [deleteTarget, setDeleteTarget] = useState<CarDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), sortBy, sortDir });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    const res = await fetch(`/api/cars?${p}`);
    const data = await res.json();
    if (res.ok) { setCars(data.cars); setTotal(data.total); }
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [page, filters, sortBy, sortDir]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(1), [filters, sortBy, sortDir]);
  useEffect(() => { fetch("/api/users").then((r) => r.ok ? r.json() : { users: [] }).then((d) => setWorkers(d.users || [])); }, []);
  useEffect(() => { if (addOpen) fetch("/api/inventory?status=available").then((r) => r.ok ? r.json() : { items: [] }).then((d) => setStock(d.items || [])); }, [addOpen]);

  // Alege o mașină din stoc → completează datele și prețurile (preț cump. =
  // preț cerut de client, preț vânz. = preț vânzare; profitul rezultă = adaosul).
  function pickFromStock(id: string) {
    if (!id) { setNewSale((s) => ({ ...s, inventoryId: "" })); return; }
    const it = stock.find((s) => s._id === id);
    if (!it) return;
    setNewSale((s) => ({
      ...s, inventoryId: id, brand: it.brand, model: it.model, year: String(it.year),
      vin: it.vin ?? "", color: it.color ?? "", engine: it.engine ?? "",
      priceBuy: String(it.purchaseCost ?? it.clientWantPrice), priceSell: String(it.sellPrice), profit: "",
    }));
  }

  function toggleSort(c: string) { if (sortBy === c) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortBy(c); setSortDir("asc"); } }


  async function saveNew() {
    if (!newSale.clientName || !newSale.clientPhone || !newSale.brand || !newSale.model || !newSale.year || !newSale.vin || !newSale.priceSell) {
      toast.error("Completați câmpurile obligatorii."); return;
    }
    setSavingNew(true);
    const res = await fetch("/api/cars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSale) });
    const data = await res.json();
    setSavingNew(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Vânzare adăugată"); setAddOpen(false); setNewSale({ ...NEW_SALE }); setStockQuery(""); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/cars/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Vânzare ștearsă"); setDeleteTarget(null); load();
  }

  const setF = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));



  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vânzări</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { window.location.href = "/api/export"; toast("Se generează Excel..."); }}>
            <IconDownload className="h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={() => { setNewSale({ ...NEW_SALE }); setStockQuery(""); setAddOpen(true); }}>Adaugă vânzare</Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-3 lg:grid-cols-6">
        <Input label="Căutare" placeholder="Client, telefon, VIN" value={filters.search} onChange={(e) => setF("search", e.target.value)} />
        <Input label="Marcă" value={filters.brand} onChange={(e) => setF("brand", e.target.value)} />
        <Input label="Vânzător" value={filters.worker} onChange={(e) => setF("worker", e.target.value)} />
        <Select label="Plată" value={filters.payment} onChange={(e) => setF("payment", e.target.value)}>
          <option value="">Toate</option><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
        </Select>
        <Select label="Status" value={filters.status} onChange={(e) => setF("status", e.target.value)}>
          <option value="">Toate</option><option value="available">Disponibilă</option><option value="reserved">Rezervată</option><option value="sold">Vândută</option>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input label="De la" type="date" value={filters.dateFrom} onChange={(e) => setF("dateFrom", e.target.value)} />
          <Input label="Până la" type="date" value={filters.dateTo} onChange={(e) => setF("dateTo", e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <>
        <SalesCards cars={cars} />

        <SalesTable
          cars={cars}
          page={page}
          sortBy={sortBy}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onCarsChange={setCars}
          onDelete={setDeleteTarget}
        />
        </>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      <p className="mt-2 text-xs text-slate-400">Click pe o celulă (inclusiv Profit) pentru editare. Click pe telefon pentru a-l dezvălui (se înregistrează în jurnal).</p>

      <AddSaleModal
        open={addOpen}
        sale={newSale}
        setSale={setNewSale}
        saving={savingNew}
        stockQuery={stockQuery}
        onPickStock={(label, invId) => { setStockQuery(label); pickFromStock(invId); }}
        workers={workers}
        onClose={() => setAddOpen(false)}
        onSave={saveNew}
      />

      <ConfirmDialog open={!!deleteTarget} title="Ștergere vânzare"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.clientName})?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
