"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const EMPTY = {
  clientName: "",
  clientPhone: "",
  brand: "",
  model: "",
  year: new Date().getFullYear().toString(),
  vin: "",
  color: "",
  priceSell: "",
  profit: "",
  paymentMethod: "cash",
  saleDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function SaleForm() {
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Eroare la înregistrare.");
      return;
    }
    toast.success("Vânzare înregistrată cu succes");
    setForm({ ...EMPTY });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Înregistrează vânzare
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Completați datele și apăsați „Înregistrează vânzarea”.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nume client *" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} required />
          <Input label="Telefon client *" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} required />
          <Input label="Marcă *" value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
          <Input label="Model *" value={form.model} onChange={(e) => set("model", e.target.value)} required />
          <Input label="An *" type="number" value={form.year} onChange={(e) => set("year", e.target.value)} required />
          <Input label="VIN *" value={form.vin} onChange={(e) => set("vin", e.target.value)} required />
          <Input label="Culoare" value={form.color} onChange={(e) => set("color", e.target.value)} />
          <Input label="Preț vânzare (€) *" type="number" step="0.01" value={form.priceSell} onChange={(e) => set("priceSell", e.target.value)} required />
          <Input label="Profit (€) *" type="number" step="0.01" value={form.profit} onChange={(e) => set("profit", e.target.value)} placeholder="Profitul la această mașină" required />
          <Select label="Metodă de plată *" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="rate">Rate</option>
          </Select>
          <Input label="Data vânzării *" type="date" value={form.saleDate} onChange={(e) => set("saleDate", e.target.value)} required />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="mt-6">
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Înregistrează vânzarea
          </Button>
        </div>
      </form>
    </div>
  );
}
