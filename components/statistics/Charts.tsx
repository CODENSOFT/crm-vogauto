"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyDatum {
  month: string;
  count: number;
  revenue: number;
  profit: number;
}

// "2026-06" → "iun. 2026" (etichetă lizibilă în loc de cod numeric).
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Intl.DateTimeFormat("ro-RO", { month: "short", year: "numeric" }).format(
    new Date(y, mo - 1, 1)
  );
}

// Sume compacte pentru axă: 12500 → "12,5 mii €".
function compactEuro(v: number) {
  return (
    new Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 1 }).format(v) +
    " €"
  );
}

// Sumă completă pentru tooltip: "12.500 €".
function fullEuro(v: number) {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(v) + " €";
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px -12px rgba(15,23,42,0.18)",
  fontSize: 12,
} as const;

const axisProps = { fontSize: 12, tickLine: false, axisLine: { stroke: "#e2e8f0" } } as const;

export function SalesBarChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Mașini vândute pe lună</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="barCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(m: string) => monthLabel(m)} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
          <Bar dataKey="count" name="Vândute" fill="url(#barCount)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ManagerSalesChart({
  data,
}: {
  data: { name: string; total: number }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Total vânzări pe manager
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="name" width={120} {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
          <Bar dataKey="total" name="Vânzări" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueLineChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Venit pe lună</h3>
        <span className="text-xs text-slate-400">în euro (€)</span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Coloanele albastre = banii încasați. Coloanele verzi = profitul.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={4}>
          <defs>
            <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="barProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
          <YAxis tickFormatter={compactEuro} width={64} {...axisProps} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(m: string) => monthLabel(m)}
            formatter={(v: number, name) => [fullEuro(v), name]}
            cursor={{ fill: "rgba(37,99,235,0.06)" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="revenue"
            name="Venit încasat"
            fill="url(#barRevenue)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="profit"
            name="Profit"
            fill="url(#barProfit)"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PAYMENT_LABELS_RO: Record<string, string> = { cash: "Cash", transfer: "Transfer", rate: "Rate" };
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export function PaymentDonut({ data }: { data: { method: string; count: number; revenue: number }[] }) {
  const rows = data.map((d) => ({ name: PAYMENT_LABELS_RO[d.method] ?? d.method, value: d.count, revenue: d.revenue }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Metode de plată</h3>
      {total === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Nicio vânzare.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={64} outerRadius={96} paddingAngle={2}>
              {rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, n]} />
            <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function BrandBar({ data }: { data: { brand: string; count: number; revenue: number }[] }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Vânzări pe marcă</h3>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Nicio vânzare.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
          <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="brand" width={90} {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(37,99,235,0.06)" }} formatter={(v: number, n) => [n === "count" ? `${v} mașini` : fullEuro(v), n === "count" ? "Vândute" : "Venit"]} />
            <Bar dataKey="count" name="count" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
