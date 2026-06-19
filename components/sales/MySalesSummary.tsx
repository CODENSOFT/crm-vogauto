"use client";

import { useState, useEffect, useCallback } from "react";
import { formatMoney } from "@/lib/utils";

interface MonthRow {
  month: string;
  count: number;
  revenue: number;
  profit: number;
  commission: number;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(new Date(y, mo - 1, 1));
}

export function MySalesSummary() {
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, revenue: 0, profit: 0, commission: 0 });
  const [pct, setPct] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/my-sales");
    if (res.ok) {
      const d = await res.json();
      setMonthly(d.monthly);
      setTotals(d.totals);
      setPct(d.commissionPercent ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Vânzările mele</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Totalul vânzărilor pe lună, profitul și comisionul.</p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Defalcare pe luni</h2>
          <span className="text-xs text-slate-500">Comision: <span className="font-semibold text-slate-700">{pct}%</span></span>
        </div>
        {loading ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">Se încarcă...</div>
        ) : monthly.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-400">Nu ai înregistrat încă nicio vânzare.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-2.5 text-left font-semibold text-slate-600">Luna</th>
                <th className="px-5 py-2.5 text-center font-semibold text-slate-600">Vânzări</th>
                <th className="px-5 py-2.5 text-right font-semibold text-slate-600">Total</th>
                <th className="px-5 py-2.5 text-right font-semibold text-slate-600">Profit</th>
                <th className="px-5 py-2.5 text-right font-semibold text-slate-600">Comision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="px-5 py-2.5 capitalize text-slate-800">{monthLabel(m.month)}</td>
                  <td className="px-5 py-2.5 text-center font-medium text-slate-800">{m.count}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{formatMoney(m.revenue)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-emerald-700">{formatMoney(m.profit)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-brand">{formatMoney(m.commission)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-5 py-2.5 font-semibold text-slate-700">Total</td>
                <td className="px-5 py-2.5 text-center font-semibold text-slate-900">{totals.count}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{formatMoney(totals.revenue)}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-700">{formatMoney(totals.profit)}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-brand">{formatMoney(totals.commission)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
