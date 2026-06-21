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
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-black/5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-7 w-16" />
        </div>
        <div className="skeleton h-11 w-11 rounded-xl" />
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bună ziua, {name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Prezentare generală a vânzărilor.</p>
      </div>

      {loading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
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
