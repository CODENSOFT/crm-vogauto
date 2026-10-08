"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import {
  ColoaneVenit, BareSubtiri, LinieProfit, BuleMarci, InelPlati, HartaLuni,
  type Luna,
} from "@/components/dashboard/OverviewCharts";
import {
  IconCar, IconCube, IconWarning,
  IconTasks, IconShare, IconTarget, IconChart,
} from "@/components/ui/Icons";

interface Alert { key: string; severity: "high" | "medium" | "low"; title: string; detail: string; count: number; link: string; }
interface MonthAgg { count: number; revenue: number; profit: number }
interface Stats {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  counts: { total: number; sold: number; available: number; reserved: number };
  stock: { total: number; available: number; sold: number; value: number };
  thisMonth: MonthAgg;
  lastMonth: MonthAgg;
  monthly: Luna[];
  topWorkers: { name: string; count: number; revenue: number; profit: number }[];
  // Întoarse de /api/stats de la bun început; pagina doar le desenează.
  payment: { method: string; count: number; revenue: number }[];
  brands: { brand: string; count: number; revenue: number }[];
}

const ZERO: Stats = {
  totalRevenue: 0, totalProfit: 0, profitMargin: 0,
  counts: { total: 0, sold: 0, available: 0, reserved: 0 },
  stock: { total: 0, available: 0, sold: 0, value: 0 },
  thisMonth: { count: 0, revenue: 0, profit: 0 },
  lastMonth: { count: 0, revenue: 0, profit: 0 },
  monthly: [], topWorkers: [], payment: [], brands: [],
};

// Cartonașul din machetă: alb, colțuri mari, fără contur, umbră largă și moale.
const CARD =
  "rounded-[18px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_-18px_rgba(16,24,40,0.28)]";

function Sageata({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Deschide pagina"
      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0e1116]"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    </Link>
  );
}

function CapCard({ titlu, href }: { titlu: string; href?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-slate-500">{titlu}</h3>
      {href && <Sageata href={href} />}
    </div>
  );
}

/** Pastila verde/roșie de lângă cifra mare. */
function Pastila({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return null;
  const pct = prev === 0 ? 100 : Math.round(((now - prev) / prev) * 100);
  const up = now >= prev;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
      up ? "bg-[#d9f2e0] text-[#22a05c]" : "bg-[#fddcd8] text-[#e2543f]"
    }`}>
      {up ? "+" : ""}{pct}%
    </span>
  );
}

function CardCifra({ eticheta, valoare, now, prev, href }: {
  eticheta: string; valoare: string | number; now: number; prev: number; href: string;
}) {
  return (
    <div className={CARD}>
      <CapCard titlu={eticheta} href={href} />
      <div className="flex items-end gap-2.5">
        <span className="text-[40px] font-extrabold leading-none tracking-[-0.04em] text-[#0e1116]">{valoare}</span>
        <span className="pb-1.5"><Pastila now={now} prev={prev} /></span>
      </div>
    </div>
  );
}

function Scurtatura({ href, label, Icon }: { href: string; label: string; Icon: (p: { className?: string }) => JSX.Element }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_20px_-16px_rgba(16,24,40,0.3)] transition-colors hover:text-[#0e1116]">
      <Icon className="h-4 w-4 text-slate-400" />
      {label}
    </Link>
  );
}

function Schelet() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={CARD}>
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-4 h-9 w-24" />
        </div>
      ))}
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

  const alertTone = (s: string) => (s === "high" ? "bg-[#fddcd8] text-[#b23b2a]" : s === "medium" ? "bg-[#fdefd3] text-[#9a6b12]" : "bg-slate-100 text-slate-600");
  const today = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="font-display">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.035em] text-[#0e1116]">
          Bună ziua, {name.split(" ")[0]}
          <sup className="ml-1.5 align-super text-[13px] font-bold tracking-normal text-slate-400">CRM</sup>
        </h1>
        <p className="text-[13px] font-medium capitalize text-slate-400">{today}</p>
      </div>

      {loading || !stats ? <Schelet /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardCifra eticheta={`Vândute luna aceasta · ${stats.counts.sold} în total`}
              valoare={stats.thisMonth.count} now={stats.thisMonth.count} prev={stats.lastMonth.count}
              href="/dashboard/cars" />
            <CardCifra eticheta={`Încasări luna aceasta · marjă ${stats.profitMargin.toFixed(1)}%`}
              valoare={formatMoney(stats.thisMonth.revenue)} now={stats.thisMonth.revenue} prev={stats.lastMonth.revenue}
              href="/dashboard/statistics" />
            <CardCifra eticheta={`Profit net luna aceasta · stoc ${stats.stock.available}`}
              valoare={formatMoney(stats.thisMonth.profit)} now={stats.thisMonth.profit} prev={stats.lastMonth.profit}
              href="/dashboard/statistics" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${CARD} lg:col-span-2`}>
              <CapCard titlu="Creșterea încasărilor" href="/dashboard/statistics" />
              <ColoaneVenit data={stats.monthly} />
            </div>
            <div className="flex flex-col gap-4">
              <div className={CARD}>
                <CapCard titlu="Mașini vândute pe lună" href="/dashboard/cars" />
                <BareSubtiri data={stats.monthly} total={stats.counts.sold} unitate="vânzări" />
              </div>
              <div className={CARD}>
                <CapCard titlu="Profit pe lună" href="/dashboard/statistics" />
                <LinieProfit data={stats.monthly} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={CARD}>
              <CapCard titlu="Top mărci" href="/dashboard/statistics" />
              <BuleMarci data={stats.brands} />
            </div>
            <div className={CARD}>
              <CapCard titlu="Metode de plată" href="/dashboard/statistics" />
              <InelPlati data={stats.payment} />
            </div>
            <div className={CARD}>
              <CapCard titlu="Vânzări pe luni și ani" href="/dashboard/statistics" />
              <HartaLuni data={stats.monthly} />
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`${CARD} lg:col-span-2`}>
                <CapCard titlu="De rezolvat" />
                <ul className="flex flex-col gap-2">
                  {alerts.map((a) => (
                    <li key={a.key}>
                      <Link href={a.link} className="flex items-center justify-between gap-3 rounded-[14px] bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100">
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-[#0e1116]">{a.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{a.detail}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${alertTone(a.severity)}`}>
                          <IconWarning className="mr-1 inline h-3 w-3" />{a.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={CARD}>
                <CapCard titlu="Top vânzători" href="/dashboard/managers" />
                <Vanzatori list={stats.topWorkers} />
              </div>
            </div>
          )}

          {alerts.length === 0 && (
            <div className={`${CARD} mt-4`}>
              <CapCard titlu="Top vânzători" href="/dashboard/managers" />
              <Vanzatori list={stats.topWorkers} />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Scurtatura href="/dashboard/cars" label="Vânzări" Icon={IconCar} />
            <Scurtatura href="/dashboard/inventory" label="Stoc" Icon={IconCube} />
            <Scurtatura href="/dashboard/tasks" label="Sarcini" Icon={IconTasks} />
            <Scurtatura href="/dashboard/leads" label="Clienți potențiali" Icon={IconTarget} />
            <Scurtatura href="/dashboard/publishing" label="Publicare" Icon={IconShare} />
            <Scurtatura href="/dashboard/statistics" label="Statistici" Icon={IconChart} />
          </div>
        </>
      )}
    </div>
  );
}

function Vanzatori({ list }: { list: Stats["topWorkers"] }) {
  if (list.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Nicio vânzare încă.</p>;
  }
  return (
    <ol className="flex flex-col gap-2.5">
      {list.slice(0, 5).map((w, i) => (
        <li key={w.name} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              i === 0 ? "bg-[#2f6bf6] text-white" : "bg-slate-100 text-slate-500"
            }`}>{i + 1}</span>
            <span className="truncate text-[13px] font-semibold text-[#0e1116]">{w.name}</span>
          </span>
          <span className="shrink-0 text-[13px] font-bold text-[#22a05c]">{formatMoney(w.profit)}</span>
        </li>
      ))}
    </ol>
  );
}
