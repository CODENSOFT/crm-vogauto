"use client";

import {
  BarChart, Bar, Cell, ReferenceLine,
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

function plural(n: number) {
  return n === 1 ? "mașină" : "mașini";
}

/** Axe fără linii proprii: cifrele sunt de ajuns, cadrul doar aglomerează. */
const AXIS = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

/* ——— Cadrul comun al panourilor ————————————————————————————————— */

/** Evoluția ultimei luni față de precedenta, ca procent. `null` = nu se poate calcula. */
function trendPct(series: number[]) {
  if (series.length < 2) return null;
  const now = series[series.length - 1];
  const prev = series[series.length - 2];
  if (prev === 0) return now === 0 ? null : 100;
  return Math.round(((now - prev) / prev) * 100);
}

function TrendChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

/**
 * Panou de grafic: titlu cu cifra mare în stânga, evoluția în dreapta,
 * graficul la mijloc și o linie de concluzie jos. Cifra se citește înaintea
 * graficului, iar concluzia scutește cititorul de interpretare.
 */
function Panel({
  title, value, note, trend, footer, children,
}: {
  title: string;
  value?: string;
  note?: string;
  trend?: number | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          {value && <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>}
          {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
        </div>
        {trend !== undefined && <TrendChip pct={trend ?? null} />}
      </div>
      <div className="px-2 pt-3 sm:px-4">{children}</div>
      {footer && (
        <div className="mt-3 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs text-slate-500">
          {footer}
        </div>
      )}
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
  const totalProfit = data.reduce((s, d) => s + d.profit, 0);
  const last = data[data.length - 1];
  // Peste șase luni, cifrele de deasupra barelor s-ar suprapune.
  const cuEtichete = data.length > 0 && data.length <= 6;

  return (
    <Panel
      title="Venit și profit pe lună"
      value={fullEuro(total)}
      note={`venit total; din care ${fullEuro(totalProfit)} profit net`}
      trend={trendPct(data.map((d) => d.revenue))}
      footer={last && <>Ultima lună: {fullEuro(last.revenue)} încasat, {fullEuro(last.profit)} profit.</>}
    >
      {data.length === 0 ? <Empty /> : (
        <>
          {/* Două bare alăturate se compară dintr-o privire. Suprafețele
              suprapuse de dinainte ascundeau una pe alta. */}
          <p className="px-3 pb-1 text-xs text-slate-500">
            Bara <span className="font-semibold text-slate-700">albastră</span> = cât s-a încasat.
            Bara <span className="font-semibold text-emerald-700">verde</span> = cât a rămas profit.
          </p>
          <ChartContainer config={revenueConfig} className="aspect-auto h-[270px] w-full">
            <BarChart data={data} accessibilityLayer
              margin={{ top: cuEtichete ? 22 : 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
              <YAxis tickFormatter={compactEuro} width={58} {...AXIS} />
              <ChartTooltip
                content={<ChartTooltipContent indicator="dot" labelFormatter={(l) => monthLabel(String(l))}
                  formatter={(v) => fullEuro(Number(v))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[5, 5, 0, 0]} maxBarSize={30}>
                {cuEtichete && <LabelList dataKey="revenue" position="top" offset={6}
                  className="fill-foreground" fontSize={10} fontWeight={600}
                  formatter={(v: unknown) => compactEuro(Number(v))} />}
              </Bar>
              <Bar dataKey="profit" fill="var(--color-profit)" radius={[5, 5, 0, 0]} maxBarSize={30}>
                {cuEtichete && <LabelList dataKey="profit" position="top" offset={6}
                  className="fill-foreground" fontSize={10} fontWeight={600}
                  formatter={(v: unknown) => compactEuro(Number(v))} />}
              </Bar>
            </BarChart>
          </ChartContainer>
        </>
      )}
    </Panel>
  );
}

/* ——— Mașini vândute ———————————————————————————————————————————— */

const countConfig = {
  count: { label: "Vândute", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function SalesBarChart({ data }: { data: MonthlyDatum[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = data.length ? total / data.length : 0;

  return (
    <Panel
      title="Mașini vândute pe lună"
      value={String(total)}
      note={`${plural(total)} în perioadă`}
      trend={trendPct(data.map((d) => d.count))}
      footer={data.length > 1 && <>Media lunară: {avg.toFixed(1)} {plural(2)} (linia punctată).</>}
    >
      {data.length === 0 ? <Empty /> : (
        <ChartContainer config={countConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={data} accessibilityLayer margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...AXIS} />
            <ChartTooltip
              content={<ChartTooltipContent hideIndicator labelFormatter={(l) => monthLabel(String(l))}
                formatter={(v) => `${v} ${plural(Number(v))}`} />}
            />
            {/* Fără axă verticală: cifra stă deasupra coloanei, iar media dă reperul. */}
            {data.length > 1 && (
              <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Bar dataKey="count" fill="var(--color-count)" radius={8} maxBarSize={44}>
              <LabelList dataKey="count" position="top" offset={8}
                className="fill-foreground" fontSize={12} fontWeight={600} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  );
}

/* ——— Clasamente orizontale (manageri, mărci) ———————————————————— */

const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * Bare orizontale colorate, fiecare pe propria „pistă" gri. Pista arată cât
 * mai e până la lider, ceea ce o bară singură nu spune.
 */
function RankBars({
  rows, unitLabel, labelWidth,
}: {
  rows: { label: string; value: number }[];
  unitLabel: string;
  labelWidth: number;
}) {
  const config = { value: { label: unitLabel } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full"
      style={{ height: Math.max(180, rows.length * 42 + 16) }}>
      <BarChart data={rows} layout="vertical" accessibilityLayer
        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <XAxis type="number" dataKey="value" hide />
        <YAxis type="category" dataKey="label" width={labelWidth}
          tickLine={false} axisLine={false} tickMargin={6} />
        <ChartTooltip
          content={<ChartTooltipContent hideIndicator formatter={(v) => `${v} ${unitLabel.toLowerCase()}`} />}
        />
        <Bar dataKey="value" radius={6} barSize={22}
          background={{ fill: "#f1f5f9", radius: 6 }}>
          {rows.map((r, i) => <Cell key={r.label} fill={SERIES[i % SERIES.length]} />)}
          <LabelList dataKey="value" position="right" offset={10}
            className="fill-foreground" fontSize={12} fontWeight={600} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function BrandBar({ data }: { data: { brand: string; count: number; revenue: number }[] }) {
  const rows = data.map((d) => ({ label: d.brand, value: d.count })).sort((a, b) => b.value - a.value);
  const top = rows[0];
  return (
    <Panel
      title="Vânzări pe marcă"
      value={top ? top.label : undefined}
      note={top ? `${top.value} ${plural(top.value)} — cea mai vândută` : undefined}
      footer={rows.length > 1 && <>{rows.length} mărci vândute în perioadă.</>}
    >
      {rows.length === 0 ? <Empty text="Nicio vânzare." /> : (
        <RankBars rows={rows} unitLabel="Vândute" labelWidth={86} />
      )}
    </Panel>
  );
}

/* ——— Metode de plată ——————————————————————————————————————————— */

const PAYMENT_LABELS_RO: Record<string, string> = { cash: "Cash", transfer: "Transfer", rate: "Rate" };

/**
 * Bare, nu inel. Dintr-un inel nu se citesc cifrele: ochiul nu compară
 * unghiuri. Aici fiecare metodă are bara ei, numărul și procentul scris.
 */
export function PaymentDonut({ data }: { data: { method: string; count: number; revenue: number }[] }) {
  const rows = data
    .map((d) => ({ name: PAYMENT_LABELS_RO[d.method] ?? d.method, value: d.count }))
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const top = rows[0];

  return (
    <Panel
      title="Metode de plată"
      value={top ? top.name : undefined}
      note={top ? `cel mai folosit — ${Math.round((top.value / total) * 100)}% din vânzări` : undefined}
      footer={total > 0 && <>{total} {total === 1 ? "vânzare" : "vânzări"} în perioadă.</>}
    >
      {total === 0 ? <Empty text="Nicio vânzare." /> : (
        <ul className="flex flex-col gap-3 px-3 py-2">
          {rows.map((r, i) => {
            const pct = Math.round((r.value / total) * 100);
            return (
              <li key={r.name}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-700">{r.name}</span>
                  <span className="tabular-nums text-slate-500">
                    <span className="font-semibold text-slate-900">{r.value}</span>
                    {" "}{r.value === 1 ? "vânzare" : "vânzări"} · {pct}%
                  </span>
                </div>
                {/* Pista arată întregul, bara partea ei: se vede cât din total. */}
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SERIES[i % SERIES.length] }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
