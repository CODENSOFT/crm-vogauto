"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

interface Manager {
  id: string;
  name: string;
  commissionPercent: number;
  totalCount: number;
  totalRevenue: number;
  totalProfit: number;
  profitPercent: number;
  commissionAmount: number;
  monthly: { month: string; count: number; profit: number }[];
}
interface Data {
  months: string[];
  grandTotalProfit: number;
  grandTotalRevenue: number;
  grandTotalCount: number;
  managers: Manager[];
}

const pct = (n: number) => `${n.toFixed(1)}%`;

export function ManagersView() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (from) p.set("dateFrom", from);
    if (to) p.set("dateTo", to);
    const res = await fetch(`/api/managers?${p}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manageri — vânzări și profit</h1>
        <p className="mt-1 text-sm text-slate-500">Profitul generat de fiecare manager, ponderea în profit și comisionul.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <Input label="De la" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Până la" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Resetează</Button>
      </div>

      {loading || !data ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : data.managers.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white py-12 text-center text-slate-400 shadow-card">Nicio vânzare în perioadă.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Manager</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Vânzări</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Venit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Profit</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">% din profit</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Comision</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Comision (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.managers.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-brand-tint/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{m.totalCount}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatMoney(m.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">{formatMoney(m.totalProfit)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{pct(m.profitPercent)}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{pct(m.commissionPercent)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(m.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/80">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{data.grandTotalCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatMoney(data.grandTotalRevenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(data.grandTotalProfit)}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">100%</td>
                  <td /><td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mb-6 mt-2 text-xs text-slate-400">Comisionul (€) = Profit × procentul setat pe pagina Utilizatori.</p>

          <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-900">Defalcare pe luni</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Manager</th>
                  {data.months.map((m) => <th key={m} className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{m}</th>)}
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.managers.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-brand-tint/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    {m.monthly.map((c) => (
                      <td key={c.month} className="whitespace-nowrap px-4 py-3 text-center">
                        {c.count > 0 ? (
                          <><div className="font-medium text-slate-800">{c.count} buc.</div><div className="text-xs text-emerald-700">{formatMoney(c.profit)}</div></>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="font-semibold text-slate-900">{m.totalCount} buc.</div>
                      <div className="text-xs text-emerald-700">{formatMoney(m.totalProfit)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
