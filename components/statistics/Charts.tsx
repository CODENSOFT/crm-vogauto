"use client";

import {
  ComposedChart, BarChart, PieChart,
  Bar, Area, Line, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";

interface MonthlyDatum {
  month: string;
  count: number;
  revenue: number;
  profit: number;
}

/* ——— Convenții vizuale, într-un singur loc ——————————————————————— */

const INK = "#0f172a";       // text principal
const MUTED = "#94a3b8";     // etichete de axă
const GRID = "#f1f5f9";      // linii de ghidaj, abia vizibile
const BLUE = "#2563eb";
const GREEN = "#10b981";

const SERIES = [BLUE, GREEN, "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b"];

/** Axe fără linii proprii: cifrele sunt de ajuns, cadrul doar aglomerează. */
const AXIS = {
  tickLine: false,
  axisLine: false,
  tick: { fill: MUTED, fontSize: 11 },
} as const;

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

/* ——— Piese comune ——————————————————————————————————————————————— */

function ChartCard({
  title, meta, hint, legend, children,
}: {
  title: string;
  meta?: string;
  hint?: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {meta && <span className="text-xs font-medium text-slate-400">{meta}</span>}
      </div>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {legend && (
        <div className="mb-3 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function Empty({ text = "Încă nu sunt date." }: { text?: string }) {
  return <p className="py-16 text-center text-sm text-slate-400">{text}</p>;
}

interface TipEntry { name?: string; value?: number; color?: string; dataKey?: string }

/** Tooltip propriu: cel implicit din bibliotecă nu respectă tipografia aplicației. */
function ChartTooltip({
  active, payload, label, labelFn, valueFn,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  labelFn?: (l: string) => string;
  valueFn?: (v: number, key?: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-elevated backdrop-blur-sm">
      {label != null && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {labelFn ? labelFn(String(label)) : String(label)}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">
              {valueFn ? valueFn(Number(p.value), p.dataKey) : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CURSOR = { fill: "rgba(37,99,235,0.05)" } as const;

/* ——— Graficele ————————————————————————————————————————————————— */

export function RevenueLineChart({ data }: { data: MonthlyDatum[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <ChartCard
      title="Venit și profit pe lună"
      meta={total ? `total ${compactEuro(total)}` : undefined}
      legend={[{ label: "Venit încasat", color: BLUE }, { label: "Profit net", color: GREEN }]}
    >
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
            <YAxis tickFormatter={compactEuro} width={58} {...AXIS} />
            <Tooltip
              content={<ChartTooltip labelFn={monthLabel} valueFn={(v) => fullEuro(v)} />}
              cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
            />
            {/* Venitul ca suprafață (volum), profitul ca linie (tendință). */}
            <Area type="monotone" dataKey="revenue" name="Venit încasat"
              stroke={BLUE} strokeWidth={2} fill="url(#gRevenue)" />
            <Line type="monotone" dataKey="profit" name="Profit net"
              stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function SalesBarChart({ data }: { data: MonthlyDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <ChartCard title="Mașini vândute pe lună" meta={total ? `${total} în total` : undefined}>
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={data} margin={{ top: 18, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
            <YAxis allowDecimals={false} width={28} {...AXIS} />
            <Tooltip
              content={<ChartTooltip labelFn={monthLabel} valueFn={(v) => `${v} ${v === 1 ? "mașină" : "mașini"}`} />}
              cursor={CURSOR}
            />
            <Bar dataKey="count" name="Vândute" fill={BLUE} radius={[5, 5, 0, 0]} maxBarSize={38}>
              {/* Cifra deasupra coloanei: nu mai trebuie citită axa. */}
              <LabelList dataKey="count" position="top" fill={INK} fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function ManagerSalesChart({ data }: { data: { name: string; total: number }[] }) {
  return (
    <ChartCard title="Total vânzări pe manager">
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey="name" width={120} {...AXIS} />
            <Tooltip content={<ChartTooltip valueFn={(v) => `${v} vândute`} />} cursor={CURSOR} />
            <Bar dataKey="total" name="Vândute" fill={BLUE} radius={[0, 5, 5, 0]} maxBarSize={22}>
              <LabelList dataKey="total" position="right" fill={INK} fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

const PAYMENT_LABELS_RO: Record<string, string> = { cash: "Cash", transfer: "Transfer", rate: "Rate" };

export function PaymentDonut({ data }: { data: { method: string; count: number; revenue: number }[] }) {
  const rows = data.map((d, i) => ({
    name: PAYMENT_LABELS_RO[d.method] ?? d.method,
    value: d.count,
    revenue: d.revenue,
    color: SERIES[i % SERIES.length],
  }));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <ChartCard title="Metode de plată">
      {total === 0 ? <Empty text="Nicio vânzare." /> : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Inelul, cu totalul în centru — altfel ochiul trebuie să adune. */}
          <div className="relative h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                  {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <Tooltip
                  content={<ChartTooltip valueFn={(v) => `${v} (${Math.round((v / total) * 100)}%)`} />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{total}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">vânzări</span>
            </div>
          </div>

          {/* Legenda ca listă: are și cifre, nu doar culori. */}
          <ul className="w-full flex-1 divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-2.5 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
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

export function BrandBar({ data }: { data: { brand: string; count: number; revenue: number }[] }) {
  return (
    <ChartCard title="Vânzări pe marcă" hint="Numărul de mașini; venitul apare la trecerea cu mausul.">
      {data.length === 0 ? <Empty text="Nicio vânzare." /> : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...AXIS} />
            <YAxis type="category" dataKey="brand" width={86} {...AXIS} />
            <Tooltip
              content={<ChartTooltip valueFn={(v, key) => (key === "revenue" ? fullEuro(v) : `${v} ${v === 1 ? "mașină" : "mașini"}`)} />}
              cursor={CURSOR}
            />
            <Bar dataKey="count" name="Vândute" fill={BLUE} radius={[0, 5, 5, 0]} maxBarSize={20}>
              <LabelList dataKey="count" position="right" fill={INK} fontSize={11} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
