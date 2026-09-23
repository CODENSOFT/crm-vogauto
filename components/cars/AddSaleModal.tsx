"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CarStockPicker } from "@/components/shared/CarStockPicker";

export interface NewSale {
  clientName: string; clientPhone: string; brand: string; model: string; year: string;
  vin: string; color: string; engine: string; priceBuy: string; priceSell: string;
  profit: string; paymentMethod: string; status: string; saleDate: string;
  notes: string; soldBy: string; inventoryId: string;
}

/** Fereastra de adăugare a unei vânzări, cu alegerea mașinii din stoc. */
export function AddSaleModal({
  open, sale, setSale, saving, stockQuery, onPickStock, workers, onClose, onSave,
}: {
  open: boolean;
  sale: NewSale;
  setSale: React.Dispatch<React.SetStateAction<NewSale>>;
  saving: boolean;
  stockQuery: string;
  onPickStock: (label: string, inventoryId: string) => void;
  workers: { _id: string; fullName: string }[];
  onClose: () => void;
  onSave: () => void;
}) {
  return (
  <Modal open={open} onClose={onClose} title="Adaugă vânzare"
    footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={onSave} loading={saving}>Salvează</Button></>}>
    <div className="mb-3 rounded-lg border border-brand/20 bg-brand-tint/60 p-3">
      <CarStockPicker
        value={stockQuery}
        inventoryId={sale.inventoryId}
        onChange={onPickStock}
        label="Alege din stoc (opțional)"
        placeholder="Scrie marca (ex: Audi) și alege mașina disponibilă..."
      />
      <p className="mt-1.5 text-xs text-slate-500">Completează automat datele mașinii și prețurile din stoc. Sau lasă gol și introdu manual.</p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Input label="Nume client *" value={sale.clientName} onChange={(e) => setSale((s) => ({ ...s, clientName: e.target.value }))} />
      <Input label="Telefon *" value={sale.clientPhone} onChange={(e) => setSale((s) => ({ ...s, clientPhone: e.target.value }))} />
      <Input label="Marcă *" value={sale.brand} onChange={(e) => setSale((s) => ({ ...s, brand: e.target.value }))} />
      <Input label="Model *" value={sale.model} onChange={(e) => setSale((s) => ({ ...s, model: e.target.value }))} />
      <Input label="An *" type="number" value={sale.year} onChange={(e) => setSale((s) => ({ ...s, year: e.target.value }))} />
      <Input label="VIN *" value={sale.vin} onChange={(e) => setSale((s) => ({ ...s, vin: e.target.value }))} />
      <Input label="Culoare" value={sale.color} onChange={(e) => setSale((s) => ({ ...s, color: e.target.value }))} />
      <Input label="Preț cumpărare (€)" type="number" value={sale.priceBuy} onChange={(e) => setSale((s) => ({ ...s, priceBuy: e.target.value }))} />
      <Input label="Preț vânzare (€) *" type="number" value={sale.priceSell} onChange={(e) => setSale((s) => ({ ...s, priceSell: e.target.value }))} />
      <Input label="Profit (€)" type="number" value={sale.profit} onChange={(e) => setSale((s) => ({ ...s, profit: e.target.value }))} placeholder="alternativ la preț cump." />
      <Select label="Plată" value={sale.paymentMethod} onChange={(e) => setSale((s) => ({ ...s, paymentMethod: e.target.value }))}>
        <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
      </Select>
      <Select label="Status" value={sale.status} onChange={(e) => setSale((s) => ({ ...s, status: e.target.value }))}>
        <option value="sold">Vândută</option><option value="available">Disponibilă</option><option value="reserved">Rezervată</option>
      </Select>
      <Select label="Vândut de" value={sale.soldBy} onChange={(e) => setSale((s) => ({ ...s, soldBy: e.target.value }))}>
        <option value="">Eu (admin)</option>
        {workers.map((w) => <option key={w._id} value={w._id}>{w.fullName}</option>)}
      </Select>
      <Input label="Data *" type="date" value={sale.saleDate} onChange={(e) => setSale((s) => ({ ...s, saleDate: e.target.value }))} />
      <Input label="Note" value={sale.notes} onChange={(e) => setSale((s) => ({ ...s, notes: e.target.value }))} />
    </div>
  </Modal>
  );
}
