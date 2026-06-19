"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";
import {
  IconCar, IconMoney, IconCheck, IconBookmark, IconTrend, IconCube,
} from "@/components/ui/Icons";

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  counts: { total: number; sold: number; available: number; reserved: number };
}

function StatCard({ label, value, Icon, tone }: {
  label: string; value: string | number;
  Icon: (p: { className?: string }) => JSX.Element; tone: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function AdminDashboard({ name }: { name: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((s) => { setStats(s); setLoading(false); });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Bună ziua, {name.split(" ")[0]}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Prezentare generală a vânzărilor.</p>

      {loading || !stats ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total înregistrări" value={stats.counts.total} Icon={IconCar} tone="bg-brand-tint text-brand" />
            <StatCard label="Vândute" value={stats.counts.sold} Icon={IconMoney} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Disponibile" value={stats.counts.available} Icon={IconCheck} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Rezervate" value={stats.counts.reserved} Icon={IconBookmark} tone="bg-amber-50 text-amber-600" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Vânzări totale" value={formatMoney(stats.totalRevenue)} Icon={IconTrend} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Profit total" value={formatMoney(stats.totalProfit)} Icon={IconCube} tone="bg-slate-100 text-slate-600" />
          </div>
        </>
      )}
    </div>
  );
}
