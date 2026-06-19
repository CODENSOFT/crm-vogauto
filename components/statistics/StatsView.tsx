"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SalesBarChart, RevenueLineChart } from "@/components/statistics/Charts";
import { formatMoney } from "@/lib/utils";

interface StatsData {
  monthly: { month: string; count: number; revenue: number; profit: number }[];
  topWorkers: { name: string; count: number }[];
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgSellPrice: number;
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
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

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Statistici</h1>
      <p className="mb-4 mt-1 text-sm text-slate-500">Privire de ansamblu asupra vânzărilor.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Input label="De la" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Până la" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Resetează</Button>
      </div>

      {loading || !data ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card label="Mașini vândute" value={data.totalSales} />
            <Card label="Venit total" value={formatMoney(data.totalRevenue)} />
            <Card label="Profit total" value={formatMoney(data.totalProfit)} />
            <Card label="Preț mediu" value={formatMoney(data.avgSellPrice)} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SalesBarChart data={data.monthly} />
            <RevenueLineChart data={data.monthly} />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Cei mai buni vânzători</h3>
              <Link href="/dashboard/managers" className="text-xs font-medium text-brand hover:underline">Vezi detalii pe manageri →</Link>
            </div>
            {data.topWorkers.length === 0 ? (
              <p className="text-sm text-slate-400">Nicio vânzare în perioada selectată.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {data.topWorkers.slice(0, 5).map((w, i) => (
                  <li key={w.name} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-800">{w.name}</span>
                    </span>
                    <span className="text-sm text-slate-500">{w.count} vânzări</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}
