"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import {
  IconCar, IconMoney, IconCheck, IconTrend, IconCube, IconWarning,
} from "@/components/ui/Icons";

interface Alert { key: string; severity: "high" | "medium" | "low"; title: string; detail: string; count: number; link: string; }

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  counts: { total: number; sold: number; available: number; reserved: number };
  stock: { total: number; available: number; sold: number; value: number };
}

const ZERO: Stats = {
  totalRevenue: 0, totalProfit: 0,
  counts: { total: 0, sold: 0, available: 0, reserved: 0 },
  stock: { total: 0, available: 0, sold: 0, value: 0 },
};

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
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStats(s && s.counts ? { ...ZERO, ...s, stock: { ...ZERO.stock, ...(s.stock || {}) } } : ZERO))
      .catch(() => setStats(ZERO))
      .finally(() => setLoading(false));
    fetch("/api/alerts").then((r) => (r.ok ? r.json() : { alerts: [] })).then((d) => setAlerts(d.alerts || [])).catch(() => {});
  }, []);

  const alertTone = (s: string) => (s === "high" ? "border-red-200 bg-red-50 text-red-700" : s === "medium" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bună ziua, {name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Prezentare generală — stoc și vânzări.</p>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <IconWarning className="h-4 w-4 text-amber-500" /> De rezolvat
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alerts.map((a) => (
              <Link key={a.key} href={a.link} className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-card ${alertTone(a.severity)}`}>
                <div>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="mt-0.5 text-xs opacity-80">{a.detail}</div>
                </div>
                <span className="mt-0.5 shrink-0 text-lg font-bold">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Stoc mașini — mașinile de vânzare */}
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Stoc mașini</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Mașini în stoc (disponibile)" value={stats.stock.available} Icon={IconCube} tone="bg-brand-tint text-brand" />
            <StatCard label="Valoare stoc" value={formatMoney(stats.stock.value)} Icon={IconTrend} tone="bg-emerald-50 text-emerald-600" />
          </div>

          {/* Vânzări — realizate */}
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-500">Vânzări realizate</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Mașini vândute" value={stats.counts.sold} Icon={IconMoney} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Încasări totale" value={formatMoney(stats.totalRevenue)} Icon={IconCar} tone="bg-brand-tint text-brand" />
            <StatCard label="Profit total" value={formatMoney(stats.totalProfit)} Icon={IconCheck} tone="bg-emerald-50 text-emerald-600" />
          </div>
        </>
      )}
    </div>
  );
}
