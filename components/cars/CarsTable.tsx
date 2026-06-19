"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Pagination } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { IconDownload, IconEye } from "@/components/ui/Icons";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { type CarDTO } from "@/types";

const EMPTY_FILTERS = { search: "", brand: "", worker: "", payment: "", status: "", dateFrom: "", dateTo: "" };
const NEW_SALE = {
  clientName: "", clientPhone: "", brand: "", model: "", year: String(new Date().getFullYear()),
  vin: "", color: "", priceBuy: "", priceSell: "", profit: "", paymentMethod: "cash", status: "sold",
  saleDate: new Date().toISOString().slice(0, 10), notes: "", soldBy: "",
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

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [newSale, setNewSale] = useState({ ...NEW_SALE });
  const [savingNew, setSavingNew] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CarDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), sortBy, sortDir });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    const res = await fetch(`/api/cars?${p}`);
    const data = await res.json();
    if (res.ok) { setCars(data.cars); setTotal(data.total); setRevealed({}); }
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [page, filters, sortBy, sortDir]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(1), [filters, sortBy, sortDir]);
  useEffect(() => { fetch("/api/users").then((r) => r.ok ? r.json() : { users: [] }).then((d) => setWorkers(d.users || [])); }, []);

  function toggleSort(c: string) { if (sortBy === c) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortBy(c); setSortDir("asc"); } }
  const sortInd = (c: string) => (sortBy === c ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  function startEdit(car: CarDTO, field: keyof CarDTO) { setEditing(`${car._id}:${field}`); const v = car[field]; setEditValue(v == null ? "" : String(v)); }
  function startEditProfit(car: CarDTO) { setEditing(`${car._id}:profit`); setEditValue(String(Number(car.priceSell) - Number(car.priceBuy))); }

  async function patch(car: CarDTO, payload: Record<string, unknown>, okMsg = "Salvat") {
    const res = await fetch(`/api/cars/${car._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    if (data.car) { toast.success(okMsg); setCars((prev) => prev.map((c) => c._id === car._id ? { ...c, ...data.car } : c)); }
  }
  async function saveField(car: CarDTO, field: string) { setEditing(null); await patch(car, { [field]: editValue }); }
  async function saveProfit(car: CarDTO) { setEditing(null); await patch(car, { profit: editValue }, "Profit actualizat"); }

  async function revealPhone(car: CarDTO) {
    if (revealed[car._id]) return;
    const res = await fetch(`/api/cars/${car._id}/reveal-phone`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setRevealed((r) => ({ ...r, [car._id]: data.phone }));
  }

  async function saveNew() {
    if (!newSale.clientName || !newSale.clientPhone || !newSale.brand || !newSale.model || !newSale.year || !newSale.vin || !newSale.priceSell) {
      toast.error("Completați câmpurile obligatorii."); return;
    }
    setSavingNew(true);
    const res = await fetch("/api/cars", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSale) });
    const data = await res.json();
    setSavingNew(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Vânzare adăugată"); setAddOpen(false); setNewSale({ ...NEW_SALE }); load();
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

  function Cell({ car, field, type = "text", display }: { car: CarDTO; field: keyof CarDTO; type?: string; display: React.ReactNode }) {
    const id = `${car._id}:${field}`;
    if (editing === id) return (
      <input autoFocus type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => saveField(car, field)}
        onKeyDown={(e) => { if (e.key === "Enter") saveField(car, field); if (e.key === "Escape") setEditing(null); }}
        className="w-24 rounded border border-brand px-1 py-0.5 text-sm outline-none" />
    );
    return <span onClick={() => startEdit(car, field)} className="block min-h-[1.25rem] cursor-pointer rounded px-1 hover:bg-blue-50" title="Click pentru editare">{display}</span>;
  }

  const headers: [string, string][] = [
    ["", "#"], ["clientName", "Client"], ["", "Telefon"], ["brand", "Marcă"], ["", "Model"], ["year", "An"],
    ["", "VIN"], ["", "Culoare"], ["priceBuy", "Preț cump."], ["priceSell", "Preț vânz."], ["", "Profit"],
    ["", "Plată"], ["", "Vândut de"], ["saleDate", "Data"], ["", "Status"], ["", "Note"], ["", ""],
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Vânzări</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { window.location.href = "/api/export"; toast("Se generează Excel..."); }}>
            <IconDownload className="h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={() => setAddOpen(true)}>Adaugă vânzare</Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
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
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>{headers.map(([col, lbl], i) => (
                <th key={i} onClick={() => col && toggleSort(col)} className={`whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-600 ${col ? "cursor-pointer select-none hover:text-brand" : ""}`}>{lbl}{col ? sortInd(col) : ""}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cars.length === 0 ? (
                <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">Nicio vânzare găsită.</td></tr>
              ) : cars.map((car, idx) => {
                const profit = Number(car.priceSell) - Number(car.priceBuy);
                return (
                  <tr key={car._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-3 py-2"><Cell car={car} field="clientName" display={car.clientName} /></td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {revealed[car._id] ? revealed[car._id] : (
                        <button onClick={() => revealPhone(car)} className="inline-flex items-center gap-1 text-slate-600 hover:text-brand" title="Click pentru a dezvălui">
                          {car.clientPhone} <IconEye className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2"><Cell car={car} field="brand" display={car.brand} /></td>
                    <td className="px-3 py-2"><Cell car={car} field="model" display={car.model} /></td>
                    <td className="px-3 py-2"><Cell car={car} field="year" type="number" display={car.year} /></td>
                    <td className="px-3 py-2 font-mono text-xs"><Cell car={car} field="vin" display={car.vin} /></td>
                    <td className="px-3 py-2"><Cell car={car} field="color" display={car.color ?? "—"} /></td>
                    <td className="px-3 py-2"><Cell car={car} field="priceBuy" type="number" display={formatMoney(car.priceBuy)} /></td>
                    <td className="px-3 py-2"><Cell car={car} field="priceSell" type="number" display={formatMoney(car.priceSell)} /></td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {editing === `${car._id}:profit` ? (
                        <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveProfit(car)} onKeyDown={(e) => { if (e.key === "Enter") saveProfit(car); if (e.key === "Escape") setEditing(null); }}
                          className="w-24 rounded border border-brand px-1 py-0.5 text-sm outline-none" />
                      ) : (
                        <span onClick={() => startEditProfit(car)} className={`block cursor-pointer rounded px-1 font-medium hover:bg-blue-50 ${profit >= 0 ? "text-green-600" : "text-red-600"}`} title="Click pentru editarea profitului">{formatMoney(profit)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select value={car.paymentMethod} onChange={(e) => patch(car, { paymentMethod: e.target.value })} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300">
                        <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{car.soldByName ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateShort(car.saleDate)}</td>
                    <td className="px-3 py-2">
                      <select value={car.status} onChange={(e) => patch(car, { status: e.target.value })} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-300">
                        <option value="available">Disponibilă</option><option value="reserved">Rezervată</option><option value="sold">Vândută</option>
                      </select>
                    </td>
                    <td className="max-w-[10rem] px-3 py-2"><Cell car={car} field="notes" display={<span className="block truncate">{car.notes ?? "—"}</span>} /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => setDeleteTarget(car)}>Șterge</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      <p className="mt-2 text-xs text-slate-400">Click pe o celulă (inclusiv Profit) pentru editare. Click pe telefon pentru a-l dezvălui (se înregistrează în jurnal).</p>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adaugă vânzare"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)} disabled={savingNew}>Anulează</Button><Button onClick={saveNew} loading={savingNew}>Salvează</Button></>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nume client *" value={newSale.clientName} onChange={(e) => setNewSale((s) => ({ ...s, clientName: e.target.value }))} />
          <Input label="Telefon *" value={newSale.clientPhone} onChange={(e) => setNewSale((s) => ({ ...s, clientPhone: e.target.value }))} />
          <Input label="Marcă *" value={newSale.brand} onChange={(e) => setNewSale((s) => ({ ...s, brand: e.target.value }))} />
          <Input label="Model *" value={newSale.model} onChange={(e) => setNewSale((s) => ({ ...s, model: e.target.value }))} />
          <Input label="An *" type="number" value={newSale.year} onChange={(e) => setNewSale((s) => ({ ...s, year: e.target.value }))} />
          <Input label="VIN *" value={newSale.vin} onChange={(e) => setNewSale((s) => ({ ...s, vin: e.target.value }))} />
          <Input label="Culoare" value={newSale.color} onChange={(e) => setNewSale((s) => ({ ...s, color: e.target.value }))} />
          <Input label="Preț cumpărare (€)" type="number" value={newSale.priceBuy} onChange={(e) => setNewSale((s) => ({ ...s, priceBuy: e.target.value }))} />
          <Input label="Preț vânzare (€) *" type="number" value={newSale.priceSell} onChange={(e) => setNewSale((s) => ({ ...s, priceSell: e.target.value }))} />
          <Input label="Profit (€)" type="number" value={newSale.profit} onChange={(e) => setNewSale((s) => ({ ...s, profit: e.target.value }))} placeholder="alternativ la preț cump." />
          <Select label="Plată" value={newSale.paymentMethod} onChange={(e) => setNewSale((s) => ({ ...s, paymentMethod: e.target.value }))}>
            <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
          </Select>
          <Select label="Status" value={newSale.status} onChange={(e) => setNewSale((s) => ({ ...s, status: e.target.value }))}>
            <option value="sold">Vândută</option><option value="available">Disponibilă</option><option value="reserved">Rezervată</option>
          </Select>
          <Select label="Vândut de" value={newSale.soldBy} onChange={(e) => setNewSale((s) => ({ ...s, soldBy: e.target.value }))}>
            <option value="">Eu (admin)</option>
            {workers.map((w) => <option key={w._id} value={w._id}>{w.fullName}</option>)}
          </Select>
          <Input label="Data *" type="date" value={newSale.saleDate} onChange={(e) => setNewSale((s) => ({ ...s, saleDate: e.target.value }))} />
          <Input label="Note" value={newSale.notes} onChange={(e) => setNewSale((s) => ({ ...s, notes: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere vânzare"
        message={`Sigur ștergeți ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.clientName})?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
