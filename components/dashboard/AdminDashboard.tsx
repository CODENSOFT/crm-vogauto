"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { RevenueLineChart } from "@/components/statistics/Charts";
import {
  IconCar, IconMoney, IconCheck, IconTrend, IconCube, IconWarning,
  IconTasks, IconShare, IconTarget, IconChart,
} from "@/components/ui/Icons";

interface Alert { key: string; severity: "high" | "medium" | "low"; title: string; detail: string; count: number; link: string; }
interface MonthAgg { count: number; revenue: number; profit: number }
interface Stats {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  counts: { total: number; sold: number; available: number; reserved: number };
  stock: { total: number; available: number; sold: number; value: number; avgAgeDays: number };
  thisMonth: MonthAgg;
  lastMonth: MonthAgg;
  monthly: { month: string; count: number; revenue: number; profit: number }[];
  topWorkers: { name: string; count: number; revenue: number; profit: number }[];
}

const ZERO: Stats = {
  totalRevenue: 0, totalProfit: 0, profitMargin: 0,
  counts: { total: 0, sold: 0, available: 0, reserved: 0 },
  stock: { total: 0, available: 0, sold: 0, value: 0, avgAgeDays: 0 },
  thisMonth: { count: 0, revenue: 0, profit: 0 },
  lastMonth: { count: 0, revenue: 0, profit: 0 },
  monthly: [], topWorkers: [],
};

function StatCard({ label, value, Icon, tone, sub }: {
  label: string; value: string | number; Icon: (p: { className?: string }) => JSX.Element; tone: string; sub?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-black/5 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <span className="text-slate-400">— fără schimbare</span>;
  const pct = prev === 0 ? 100 : Math.round(((now - prev) / prev) * 100);
  const up = now >= prev;
  return <span className={up ? "text-emerald-600" : "text-red-500"}>{up ? "▲" : "▼"} {Math.abs(pct)}% vs luna trecută</span>;
}

function QuickLink({ href, label, Icon }: { href: string; label: string; Icon: (p: { className?: string }) => JSX.Element }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon className="h-5 w-5" /></span>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5"><div className="skeleton h-3 w-24" /><div className="skeleton h-7 w-16" /></div>
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
      .then((s) => setStats(s && s.counts ? { ...ZERO, ...s, stock: { ...ZERO.stock, ...s.stock }, thisMonth: { ...ZERO.thisMonth, ...s.thisMonth }, lastMonth: { ...ZERO.lastMonth, ...s.lastMonth } } : ZERO))
      .catch(() => setStats(ZERO))
      .finally(() => setLoading(false));
    fetch("/api/alerts").then((r) => (r.ok ? r.json() : { alerts: [] })).then((d) => setAlerts(d.alerts || [])).catch(() => {});
  }, []);

  const alertTone = (s: string) => (s === "high" ? "border-red-200 bg-red-50 text-red-700" : s === "medium" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600");
  const today = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div>
      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-sidebar-gradient p-6 text-white shadow-elevated">
        <h1 className="text-2xl font-bold tracking-tight">Bună ziua, {name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm capitalize text-slate-300">{today}</p>
        {stats && (
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <span><span className="text-slate-400">În stoc: </span><span className="font-semibold">{stats.stock.available}</span></span>
            <span><span className="text-slate-400">Vândute luna asta: </span><span className="font-semibold">{stats.thisMonth.count}</span></span>
            <span><span className="text-slate-400">Profit luna asta: </span><span className="font-semibold text-emerald-300">{formatMoney(stats.thisMonth.profit)}</span></span>
          </div>
        )}
      </div>

      {/* Acțiuni rapide */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        <QuickLink href="/dashboard/cars" label="Vânzări" Icon={IconCar} />
        <QuickLink href="/dashboard/inventory" label="Stoc" Icon={IconCube} />
        <QuickLink href="/dashboard/tasks" label="Sarcini" Icon={IconTasks} />
        <QuickLink href="/dashboard/leads" label="Clienți potențiali" Icon={IconTarget} />
        <QuickLink href="/dashboard/publishing" label="Publicare" Icon={IconShare} />
        <QuickLink href="/dashboard/statistics" label="Statistici" Icon={IconChart} />
      </div>

      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <IconWarning className="h-4 w-4 text-amber-500" /> De rezolvat
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alerts.map((a) => (
              <Link key={a.key} href={a.link} className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-card ${alertTone(a.severity)}`}>
                <div><div className="text-sm font-semibold">{a.title}</div><div className="mt-0.5 text-xs opacity-80">{a.detail}</div></div>
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
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Luna curentă</h2>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Mașini vândute" value={stats.thisMonth.count} Icon={IconMoney} tone="bg-indigo-50 text-indigo-600" sub={<Delta now={stats.thisMonth.count} prev={stats.lastMonth.count} />} />
            <StatCard label="Încasări" value={formatMoney(stats.thisMonth.revenue)} Icon={IconCar} tone="bg-brand-tint text-brand" sub={<Delta now={stats.thisMonth.revenue} prev={stats.lastMonth.revenue} />} />
            <StatCard label="Profit net" value={formatMoney(stats.thisMonth.profit)} Icon={IconCheck} tone="bg-emerald-50 text-emerald-600" sub={<Delta now={stats.thisMonth.profit} prev={stats.lastMonth.profit} />} />
          </div>

          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Sinteză</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Mașini în stoc" value={stats.stock.available} Icon={IconCube} tone="bg-brand-tint text-brand" />
            <StatCard label="Valoare stoc" value={formatMoney(stats.stock.value)} Icon={IconTrend} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Vândute (total)" value={stats.counts.sold} Icon={IconCar} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Profit net (total)" value={formatMoney(stats.totalProfit)} Icon={IconCheck} tone="bg-emerald-50 text-emerald-600" sub={`marjă ${stats.profitMargin.toFixed(1)}%`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><RevenueLineChart data={stats.monthly} /></div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Top vânzători</h3>
                <Link href="/dashboard/managers" className="text-xs font-medium text-brand hover:underline">Toți →</Link>
              </div>
              {stats.topWorkers.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Nicio vânzare încă.</p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {stats.topWorkers.slice(0, 5).map((w, i) => {
                    const rank = ["bg-amber-100 text-amber-700", "bg-slate-200 text-slate-600", "bg-orange-100 text-orange-700"][i] ?? "bg-slate-100 text-slate-500";
                    return (
                      <li key={w.name} className="flex items-center justify-between py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${rank}`}>{i + 1}</span>
                          <span className="text-sm font-medium text-slate-800">{w.name}</span>
                        </span>
                        <span className="text-sm font-semibold text-emerald-700">{formatMoney(w.profit)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
