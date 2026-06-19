"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyDatum {
  month: string;
  count: number;
  revenue: number;
  profit: number;
}

export function SalesBarChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-slate-700">Mașini vândute pe lună</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Vândute" fill="#2563eb" radius={[4, 4, 0, 0]} />
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Total vânzări pe manager
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="name" fontSize={12} width={120} />
          <Tooltip />
          <Bar dataKey="total" name="Vânzări" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueLineChart({ data }: { data: MonthlyDatum[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-slate-700">Venit pe lună (€)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip formatter={(v: number) => `${v.toLocaleString("ro-RO")} €`} />
          <Line type="monotone" dataKey="revenue" name="Venit" stroke="#10b981" strokeWidth={2} />
          <Line type="monotone" dataKey="profit" name="Profit" stroke="#f59e0b" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
