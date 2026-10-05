"use client";

import {
  ComposedChart, BarChart, PieChart,
  Bar, Area, Line, Pie, Cell,
  XAxis, YAxis, CartesianGrid, LabelList,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";

interface MonthlyDatum {
  month: string;
  count: number;
  revenue: number;
  profit: number;
}

// "2026-06" → "iun. 2026"
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Intl.DateTimeFormat("ro-RO", { month: "short", year: "numeric" }).format(new Date(y, mo - 1, 1));
}

function compactEuro(v: number) {
  return new Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 1 }).format(v) + " €";
}

function fullEuro(v: number) {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(v) + " €";
}

/** Axe fără linii proprii: cifrele sunt de ajuns, cadrul doar aglomerează. */
const AXIS = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

function ChartCard({
  title, meta, hint, children,
}: {
  title: string;
  meta?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {meta && <span className="text-xs font-medium text-slate-400">{meta}</span>}
      </div>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function Empty({ text = "Încă nu sunt date." }: { text?: string }) {
  return <p className="py-16 text-center text-sm text-slate-400">{text}</p>;
}

/* ——— Venit și profit ——————————————————————————————————————————— */

const revenueConfig = {
  revenue: { label: "Venit încasat", color: "var(--chart-1)" },
  profit: { label: "Profit net", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function RevenueLineChart({ data }: { data: MonthlyDatum[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <ChartCard title="Venit și profit pe lună" meta={total ? `total ${compactEuro(total)}` : undefined}>
      {data.length === 0 ? <Empty /> : (
        <ChartContainer config={revenueConfig} className="aspect-auto h-[270px] w-full">
          <ComposedChart data={data} accessibilityLayer margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
            <YAxis tickFormatter={compactEuro} width={58} {...AXIS} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(l) => monthLabel(String(l))}
                formatter={(v) => fullEuro(Number(v))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {/* Venitul ca suprafață (volum), profitul ca linie (tendință). */}
            <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)"
              strokeWidth={2} fill="url(#gRevenue)" />
            <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-profit)", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
          </ComposedChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ——— Mașini vândute ———————————————————————————————————————————— */

const countConfig = {
  count: { label: "Vândute", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SalesBarChart({ data }: { data: MonthlyDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <ChartCard title="Mașini vândute pe lună" meta={total ? `${total} în total` : undefined}>
      {data.length === 0 ? <Empty /> : (
        <ChartContainer config={countConfig} className="aspect-auto h-[270px] w-full">
          <BarChart data={data} accessibilityLayer margin={{ top: 18, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
            <YAxis allowDecimals={false} width={28} {...AXIS} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(l) => monthLabel(String(l))}
                formatter={(v) => `${v} ${Number(v) === 1 ? "mașină" : "mașini"}`} />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} maxBarSize={38}>
              {/* Cifra deasupra coloanei: nu mai trebuie citită axa. */}
              <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ——— Vânzări pe manager ———————————————————————————————————————— */

const managerConfig = {
  total: { label: "Vândute", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ManagerSalesChart({ data }: { data: { name: string; total: number }[] }) {
  return (
    <ChartCard title="Total vânzări pe manager">
      {data.length === 0 ? <Empty /> : (
        <ChartContainer config={managerConfig}
          className="aspect-auto w-full" style={{ height: Math.max(200, data.length * 40) }}>
          <BarChart data={data} layout="vertical" accessibilityLayer margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey="name" width={120} {...AXIS} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} vândute`} />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={[0, 5, 5, 0]} maxBarSize={22}>
              <LabelList dataKey="total" position="right" className="fill-foreground" fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ——— Metode de plată ——————————————————————————————————————————— */

const PAYMENT_LABELS_RO: Record<string, string> = { cash: "Cash", transfer: "Transfer", rate: "Rate" };
const PIE_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function PaymentDonut({ data }: { data: { method: string; count: number; revenue: number }[] }) {
  const rows = data.map((d, i) => ({
    name: PAYMENT_LABELS_RO[d.method] ?? d.method,
    value: d.count,
    color: PIE_VARS[i % PIE_VARS.length],
  }));
  const total = rows.reduce((s, r) => s + r.value, 0);

  const config = Object.fromEntries(
    rows.map((r) => [r.name, { label: r.name, color: r.color }])
  ) satisfies ChartConfig;

  return (
    <ChartCard title="Metode de plată">
      {total === 0 ? <Empty text="Nicio vânzare." /> : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Inelul, cu totalul în centru — altfel ochiul trebuie să adune. */}
          <div className="relative shrink-0">
            <ChartContainer config={config} className="aspect-square h-[200px] w-[200px]">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name"
                  innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                  {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" hideLabel
                    formatter={(v, n) => `${n}: ${v} (${Math.round((Number(v) / total) * 100)}%)`} />}
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{total}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">vânzări</span>
            </div>
          </div>

          {/* Legenda ca listă: are și cifre, nu doar culori. */}
          <ul className="w-full flex-1 divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-2.5 py-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="text-sm font-medium text-slate-700">{r.name}</span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-slate-900">{r.value}</span>
                <span className="w-12 text-right text-xs tabular-nums text-slate-400">
                  {Math.round((r.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

/* ——— Vânzări pe marcă —————————————————————————————————————————— */

const brandConfig = {
  count: { label: "Vândute", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BrandBar({ data }: { data: { brand: string; count: number; revenue: number }[] }) {
  return (
    <ChartCard title="Vânzări pe marcă">
      {data.length === 0 ? <Empty text="Nicio vânzare." /> : (
        <ChartContainer config={brandConfig}
          className="aspect-auto w-full" style={{ height: Math.max(200, data.length * 36) }}>
          <BarChart data={data} layout="vertical" accessibilityLayer margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey="brand" width={86} {...AXIS} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => `${v} ${Number(v) === 1 ? "mașină" : "mașini"}`} />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 5, 5, 0]} maxBarSize={20}>
              <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
