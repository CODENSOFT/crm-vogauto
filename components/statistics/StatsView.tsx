"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SalesBarChart, RevenueLineChart, PaymentDonut, BrandBar } from "@/components/statistics/Charts";
import { formatMoney } from "@/lib/utils";

interface MonthAgg { count: number; revenue: number; profit: number }
interface StatsData {
  monthly: { month: string; count: number; revenue: number; profit: number }[];
  topWorkers: { name: string; count: number; revenue: number; profit: number }[];
  payment: { method: string; count: number; revenue: number }[];
  brands: { brand: string; count: number; revenue: number }[];
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgSellPrice: number;
  avgProfit: number;
  profitMargin: number;
  bestMonth: { month: string; count: number; revenue: number; profit: number } | null;
  thisMonth: MonthAgg;
  lastMonth: MonthAgg;
  stock: { total: number; available: number; sold: number; value: number; avgAgeDays: number };
}

function monthName(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(new Date(y, mo - 1, 1));
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <span className="text-xs text-slate-400">—</span>;
  const pct = prev === 0 ? 100 : Math.round(((now - prev) / prev) * 100);
  const up = now >= prev;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${accent ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function StatsView() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const logged = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (from) p.set("dateFrom", from);
    if (to) p.set("dateTo", to);
    if (!logged.current) { p.set("log", "1"); logged.current = true; }
    const res = await fetch(`/api/stats?${p}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function quick(months: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Statistici</h1>
        <p className="mt-1 text-sm text-slate-500">Performanța vânzărilor și a stocului, dintr-o privire.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <Input label="De la" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Până la" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="flex gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => quick(1)}>Luna asta</Button>
          <Button variant="secondary" size="sm" onClick={() => quick(3)}>3 luni</Button>
          <Button variant="secondary" size="sm" onClick={() => quick(12)}>12 luni</Button>
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Tot</Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl border border-slate-200/80 bg-white shadow-card animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Luna curentă vs precedentă */}
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Luna curentă</h2>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Mașini vândute" value={data.thisMonth.count} sub={<span className="inline-flex items-center gap-1"><Delta now={data.thisMonth.count} prev={data.lastMonth.count} /> vs luna trecută</span>} />
            <Kpi label="Venit" value={formatMoney(data.thisMonth.revenue)} sub={<span className="inline-flex items-center gap-1"><Delta now={data.thisMonth.revenue} prev={data.lastMonth.revenue} /> vs luna trecută</span>} />
            <Kpi label="Profit net" value={formatMoney(data.thisMonth.profit)} accent="text-emerald-700" sub={<span className="inline-flex items-center gap-1"><Delta now={data.thisMonth.profit} prev={data.lastMonth.profit} /> vs luna trecută</span>} />
          </div>

          {/* KPI perioada selectată */}
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{from || to ? "Perioada selectată" : "Total (istoric)"}</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Mașini vândute" value={data.totalSales} />
            <Kpi label="Venit total" value={formatMoney(data.totalRevenue)} />
            <Kpi label="Profit net (total)" value={formatMoney(data.totalProfit)} accent="text-emerald-700" />
            <Kpi label="Marjă de profit" value={`${data.profitMargin.toFixed(1)}%`} />
            <Kpi label="Preț mediu / mașină" value={formatMoney(data.avgSellPrice)} />
            <Kpi label="Profit net / mașină" value={formatMoney(data.avgProfit)} />
            <Kpi label="Cea mai bună lună" value={data.bestMonth ? monthName(data.bestMonth.month) : "—"} sub={data.bestMonth ? `profit ${formatMoney(data.bestMonth.profit)}` : undefined} />
            <Kpi label="Total înregistrate" value={data.totalSales} sub="vânzări în perioadă" />
          </div>

          {/* Stoc */}
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Stoc mașini</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Kpi label="Mașini în stoc" value={data.stock.available} />
            <Kpi label="Valoare stoc" value={formatMoney(data.stock.value)} />
            <Kpi label="Vechime medie în stoc" value={`${Math.round(data.stock.avgAgeDays)} zile`} sub="mașinile disponibile" />
          </div>

          {/* Grafice */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueLineChart data={data.monthly} />
            <SalesBarChart data={data.monthly} />
            <PaymentDonut data={data.payment} />
            <BrandBar data={data.brands} />
          </div>

          {/* Top vânzători */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Clasament vânzători</h3>
              <Link href="/dashboard/managers" className="text-xs font-medium text-brand hover:underline">Detalii pe manageri →</Link>
            </div>
            {data.topWorkers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nicio vânzare în perioada selectată.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Vânzător</th>
                      <th className="py-2 pr-3 text-right">Vândute</th>
                      <th className="py-2 pr-3 text-right">Venit</th>
                      <th className="py-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topWorkers.map((w, i) => {
                      const rank = ["bg-amber-100 text-amber-700", "bg-slate-200 text-slate-600", "bg-orange-100 text-orange-700"][i] ?? "bg-slate-100 text-slate-500";
                      return (
                        <tr key={w.name} className="hover:bg-brand-tint/40">
                          <td className="py-2.5 pr-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${rank}`}>{i + 1}</span></td>
                          <td className="py-2.5 pr-3 font-medium text-slate-800">{w.name}</td>
                          <td className="py-2.5 pr-3 text-right text-slate-700">{w.count}</td>
                          <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(w.revenue)}</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-700">{formatMoney(w.profit)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
