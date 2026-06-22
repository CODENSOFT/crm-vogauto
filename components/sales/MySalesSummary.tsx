"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/utils";

interface MonthRow {
  month: string;
  count: number;
  revenue: number;
  profit: number;
  fee: number;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(new Date(y, mo - 1, 1));
}

export function MySalesSummary() {
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, revenue: 0, profit: 0, fee: 0 });
  const [fixedFee, setFixedFee] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [payout, setPayout] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/my-sales");
    if (res.ok) {
      const d = await res.json();
      setMonthly(d.monthly);
      setTotals(d.totals);
      setFixedFee(d.fixedFee ?? 0);
      setBonus(d.bonus ?? 0);
      setPayout(d.payout ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vânzările mele</h1>
        <p className="mt-1 text-sm text-slate-500">Totalul vânzărilor pe lună, taxa și bonusul.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Taxă / vânzare</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(fixedFee)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vânzări</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bonus</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(bonus)}</p>
        </div>
        <div className="rounded-xl border border-brand/20 bg-brand-tint p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Total de plată</p>
          <p className="mt-1 text-xl font-bold text-brand-dark">{formatMoney(payout)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Defalcare pe luni</h2>
          <span className="text-xs text-slate-500">Taxă: <span className="font-semibold text-slate-700">{formatMoney(fixedFee)}</span> / vânzare</span>
        </div>
        {loading ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">Se încarcă...</div>
        ) : monthly.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">Nu ai înregistrat încă nicio vânzare.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-5 py-2.5 text-left font-semibold text-slate-600">Luna</th>
                <th className="whitespace-nowrap px-5 py-2.5 text-center font-semibold text-slate-600">Vânzări</th>
                <th className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-slate-600">Total</th>
                <th className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-slate-600">Profit</th>
                <th className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-slate-600">Taxă</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="px-5 py-2.5 capitalize text-slate-800">{monthLabel(m.month)}</td>
                  <td className="px-5 py-2.5 text-center font-medium text-slate-800">{m.count}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{formatMoney(m.revenue)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-emerald-700">{formatMoney(m.profit)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-brand">{formatMoney(m.fee)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-5 py-2.5 font-semibold text-slate-700">Total</td>
                <td className="px-5 py-2.5 text-center font-semibold text-slate-900">{totals.count}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{formatMoney(totals.revenue)}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-700">{formatMoney(totals.profit)}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-brand">{formatMoney(totals.fee)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
