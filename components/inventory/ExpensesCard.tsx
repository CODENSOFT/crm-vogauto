"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney, formatDateShort } from "@/lib/utils";
import type { ExpenseDTO } from "@/types";

// Sugestii uzuale, ca să nu se scrie de fiecare dată.
const PRESETS = ["Reparație", "Detailing", "Spălare", "Piese", "Transport", "Devamare", "Asigurare"];

/** Cheltuielile suportate pentru o mașină (cât timp e în pregătire). */
export function ExpensesCard({ inventoryId, onChanged }: { inventoryId: string; onChanged?: () => void }) {
  const [items, setItems] = useState<ExpenseDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/inventory/${inventoryId}/expenses`);
    if (res.ok) {
      const d = await res.json();
      setItems(d.expenses || []);
      setTotal(d.total || 0);
    }
    setLoading(false);
  }, [inventoryId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!label.trim()) { toast.error("Scrieți ce cheltuială este."); return; }
    if (!amount || Number(amount) < 0) { toast.error("Introduceți suma."); return; }
    setSaving(true);
    const res = await fetch(`/api/inventory/${inventoryId}/expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim(), amount: Number(amount) }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(d.error || "Eroare."); return; }
    setLabel(""); setAmount("");
    toast.success("Cheltuială adăugată");
    load(); onChanged?.();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/inventory/${inventoryId}/expenses?expenseId=${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Eroare."); return; }
    toast.success("Cheltuială ștearsă");
    load(); onChanged?.();
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Cheltuieli pentru această mașină</h3>
          <p className="text-xs text-slate-400">Se scad din profit la vânzare.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
          {formatMoney(total)}
        </span>
      </div>

      {/* Adăugare rapidă */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem] flex-1">
          <Input label="Cheltuiala" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: Reparație" list="expense-presets"
            onKeyDown={(e) => e.key === "Enter" && add()} />
          <datalist id="expense-presets">
            {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
          </datalist>
        </div>
        <div className="w-32">
          <Input label="Sumă (€)" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} />
        </div>
        <Button onClick={add} loading={saving}>Adaugă</Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setLabel(p)}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand/40 hover:text-brand">
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Se încarcă...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
          Nicio cheltuială înregistrată.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((e) => (
            <li key={e._id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{e.label}</p>
                <p className="text-xs text-slate-400">
                  {formatDateShort(e.createdAt)}{e.createdByName ? ` · ${e.createdByName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{formatMoney(e.amount)}</span>
                <button type="button" onClick={() => remove(e._id)}
                  className="text-xs font-medium text-red-600 hover:underline">Șterge</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
