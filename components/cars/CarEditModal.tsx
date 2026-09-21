"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { CarDTO } from "@/types";

const dateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

// Modal de editare a unei vânzări (de pe pagina de detaliu).
export function CarEditModal({
  open, car, onClose, onSaved,
}: {
  open: boolean;
  car: CarDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", brand: "", model: "", year: "", vin: "", color: "",
    priceBuy: "", priceSell: "", paymentMethod: "cash", status: "sold", saleDate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      clientName: car.clientName, clientPhone: "", brand: car.brand, model: car.model,
      year: String(car.year), vin: car.vin, color: car.color ?? "",
      priceBuy: String(car.priceBuy ?? ""), priceSell: String(car.priceSell ?? ""),
      paymentMethod: car.paymentMethod, status: car.status, saleDate: dateInput(car.saleDate), notes: car.notes ?? "",
    });
  }, [open, car]);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.clientName || !form.brand || !form.model || !form.year || !form.vin || !form.priceSell) {
      toast.error("Completați câmpurile obligatorii."); return;
    }
    setSaving(true);
    // Trimitem doar câmpurile relevante; telefonul doar dacă a fost schimbat.
    const payload: Record<string, unknown> = {
      clientName: form.clientName, brand: form.brand, model: form.model, year: form.year,
      vin: form.vin, color: form.color, priceBuy: form.priceBuy, priceSell: form.priceSell,
      paymentMethod: form.paymentMethod, status: form.status, saleDate: form.saleDate, notes: form.notes,
    };
    if (form.clientPhone.trim()) payload.clientPhone = form.clientPhone.trim();

    const res = await fetch(`/api/cars/${car._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Vânzare actualizată");
    onSaved();
    onClose();
  }

  const profit = (Number(form.priceSell) || 0) - (Number(form.priceBuy) || 0);

  return (
    <Modal open={open} onClose={onClose} title="Editează vânzarea"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Nume client *" value={form.clientName} onChange={(e) => setF("clientName", e.target.value)} />
        <Input label="Telefon nou (opțional)" value={form.clientPhone} onChange={(e) => setF("clientPhone", e.target.value)} placeholder="Lasă gol pentru a păstra" />
        <Input label="Marcă *" value={form.brand} onChange={(e) => setF("brand", e.target.value)} />
        <Input label="Model *" value={form.model} onChange={(e) => setF("model", e.target.value)} />
        <Input label="An *" type="number" value={form.year} onChange={(e) => setF("year", e.target.value)} />
        <Input label="VIN *" value={form.vin} onChange={(e) => setF("vin", e.target.value)} />
        <Input label="Culoare" value={form.color} onChange={(e) => setF("color", e.target.value)} />
        <Input label="Preț cumpărare (€)" type="number" value={form.priceBuy} onChange={(e) => setF("priceBuy", e.target.value)} />
        <Input label="Preț vânzare (€) *" type="number" value={form.priceSell} onChange={(e) => setF("priceSell", e.target.value)} />
        <Select label="Plată" value={form.paymentMethod} onChange={(e) => setF("paymentMethod", e.target.value)}>
          <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="rate">Rate</option>
        </Select>
        <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
          <option value="sold">Vândută</option><option value="available">Disponibilă</option><option value="reserved">Rezervată</option>
        </Select>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data vânzării</label>
          <input type="date" value={form.saleDate} onChange={(e) => setF("saleDate", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
        <div className="sm:col-span-2">
          <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
        </div>
        <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Profit: <span className={`font-semibold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{new Intl.NumberFormat("ro-RO", { style: "currency", currency: "EUR" }).format(profit)}</span>
        </div>
      </div>
    </Modal>
  );
}
