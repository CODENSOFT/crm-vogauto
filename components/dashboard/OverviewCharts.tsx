"use client";

// Diagramele de pe pagina de prezentare generală, desenate după machetă.
// Toate primesc datele pe care /api/stats le întoarce deja — nu se cere nimic
// în plus și nu se calculează nimic nou aici.

import {
  BarChart, Bar, Cell, XAxis, YAxis,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis,
  PieChart, Pie,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const ALBASTRU = "#2f6bf6";
const URMA = "#f1f2f5";
const BARA = "#dcdee4";
const TURCOAZ = "#5bc8c8";
const MUT = "#9aa0aa";

export interface Luna { month: string; count: number; revenue: number; profit: number }

/** „2026-06" → „iun." */
function lunaScurt(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  if (!y || !mo) return m;
  return new Intl.DateTimeFormat("ro-RO", { month: "short" }).format(new Date(y, mo - 1, 1));
}

function euroScurt(v: number): string {
  return new Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 1 }).format(v) + " €";
}

const AXA = { tickLine: false, axisLine: false, tick: { fill: MUT, fontSize: 11 } } as const;
const CFG: ChartConfig = {};

/** Indicele valorii celei mai mari; -1 dacă lista e goală. */
function varf<T>(list: T[], val: (x: T) => number): number {
  let idx = -1;
  let max = -Infinity;
  list.forEach((x, i) => { if (val(x) > max) { max = val(x); idx = i; } });
  return idx;
}

/* ——— Coloane rotunjite, cu una evidențiată (ca „Market Growth") ——— */

// Recharts trimite x/y/width ca număr sau text, în funcție de axă.
type PozLabel = { index?: number; x?: number | string; y?: number | string; width?: number | string };

function EticheataVarf({ x, y, width, text }: PozLabel & { text: string }) {
  const px = Number(x), py = Number(y), pw = Number(width);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pw)) return <g />;
  const w = Math.max(text.length * 7 + 18, 46);
  return (
    <g transform={`translate(${px + pw / 2 - w / 2}, ${py - 30})`}>
      <rect width={w} height={22} rx={11} fill="#0e1116" />
      <text x={w / 2} y={15} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{text}</text>
    </g>
  );
}

export function ColoaneVenit({ data }: { data: Luna[] }) {
  const serie = data.slice(-8);
  const top = varf(serie, (d) => d.revenue);
  return (
    <ChartContainer config={CFG} className="h-[230px] w-full">
      <BarChart data={serie} margin={{ top: 34, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
        <XAxis dataKey="month" tickFormatter={lunaScurt} tickMargin={10} {...AXA} />
        <YAxis orientation="right" tickFormatter={euroScurt} width={62} tickMargin={6} {...AXA} />
        <Bar dataKey="revenue" radius={12} background={{ fill: URMA, radius: 12 }} isAnimationActive={false}
          label={(p: PozLabel) =>
            p.index === top && top >= 0
              ? <EticheataVarf x={p.x} y={p.y} width={p.width} text={euroScurt(serie[top].revenue)} />
              : <g />}
        >
          {serie.map((d, i) => <Cell key={d.month} fill={i === top ? ALBASTRU : BARA} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/* ——— Bare subțiri, cu cifra mare alături (ca „Daily Trends") ——— */

export function BareSubtiri({ data, total, unitate }: { data: Luna[]; total: number; unitate: string }) {
  const serie = data.slice(-24);
  const max = Math.max(1, ...serie.map((d) => d.count));
  const top = varf(serie, (d) => d.count);
  return (
    <div className="flex items-end gap-4">
      <div className="flex h-[70px] min-w-0 flex-1 items-end gap-[3px]">
        {serie.map((d, i) => (
          <span
            key={d.month}
            title={`${lunaScurt(d.month)}: ${d.count}`}
            className="min-w-[3px] flex-1 rounded-full"
            style={{
              height: `${Math.max(8, (d.count / max) * 100)}%`,
              backgroundColor: i === top ? ALBASTRU : URMA,
            }}
          />
        ))}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[26px] font-bold leading-none tracking-tight text-[#0e1116]">{total}</div>
        <div className="mt-1 text-[11px] font-medium text-slate-400">{unitate}</div>
      </div>
    </div>
  );
}

/* ——— Linie lină cu pastilă pe vârf (ca „Weekly Trends") ——— */

export function LinieProfit({ data }: { data: Luna[] }) {
  const serie = data.slice(-7);
  const top = varf(serie, (d) => d.profit);

  function punct(p: { cx?: number; cy?: number; index?: number }) {
    if (p.index !== top || p.cx == null || p.cy == null) return <g key="x" />;
    return (
      <g key="varf" transform={`translate(${p.cx - 19}, ${p.cy - 14})`}>
        <rect width={38} height={28} rx={14} fill={ALBASTRU} />
        <text x={19} y={18} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
          {lunaScurt(serie[top].month).replace(".", "")}
        </text>
      </g>
    );
  }

  return (
    <ChartContainer config={CFG} className="h-[120px] w-full">
      <LineChart data={serie} margin={{ top: 24, right: 14, left: 14, bottom: 0 }}>
        <XAxis dataKey="month" tickFormatter={lunaScurt} tickMargin={8} {...AXA} />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="monotone" dataKey="profit" stroke={ALBASTRU} strokeWidth={2.5}
          dot={punct} activeDot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}

/* ——— Bule pe rânduri (ca „Top Products") ——— */

export function BuleMarci({ data }: { data: { brand: string; count: number; revenue: number }[] }) {
  const serie = data.slice(0, 5).map((b, i) => ({ ...b, y: i }));
  if (!serie.length) return <Gol />;
  return (
    <ChartContainer config={CFG} className="h-[190px] w-full">
      <ScatterChart margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
        <XAxis type="number" dataKey="revenue" tickFormatter={euroScurt} tickMargin={8} {...AXA} />
        <YAxis type="number" dataKey="y" orientation="right" width={56} domain={[-0.6, serie.length - 0.4]}
          ticks={serie.map((s) => s.y)} tickFormatter={(v: number) => serie[v]?.brand ?? ""} {...AXA} />
        <ZAxis type="number" dataKey="count" range={[90, 620]} />
        <Scatter data={serie} isAnimationActive={false}>
          {serie.map((b, i) => (
            <Cell key={b.brand} fill={i === 0 ? ALBASTRU : TURCOAZ} fillOpacity={i === 0 ? 0.85 : 0.5} />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}

/* ——— Inel (ca „Top Exports") ——— */

const NUANTE = [ALBASTRU, "#5a8bf8", "#8fb0fb", "#c2d3fd", "#e3eafe"];

export function InelPlati({ data }: { data: { method: string; count: number }[] }) {
  const serie = data.filter((d) => d.count > 0).slice(0, 5);
  if (!serie.length) return <Gol />;
  return (
    <div className="relative">
      <ChartContainer config={CFG} className="h-[190px] w-full">
        <PieChart>
          <Pie data={serie} dataKey="count" nameKey="method" innerRadius="56%" outerRadius="88%"
            paddingAngle={3} cornerRadius={8} stroke="none" isAnimationActive={false}>
            {serie.map((d, i) => <Cell key={d.method} fill={NUANTE[i % NUANTE.length]} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {serie.map((d, i) => (
          <li key={d.method} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NUANTE[i % NUANTE.length] }} />
            {d.method} · {d.count}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ——— Pătrate colorate pe ani și luni (ca „Top Category") ——— */

const LUNI = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];

export function HartaLuni({ data }: { data: Luna[] }) {
  const ani = Array.from(new Set(data.map((d) => d.month.slice(0, 4)))).sort();
  if (!ani.length) return <Gol />;
  const max = Math.max(1, ...data.map((d) => d.count));
  const cauta = (an: string, luna: number) =>
    data.find((d) => d.month === `${an}-${String(luna + 1).padStart(2, "0")}`)?.count ?? 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[260px]">
        {LUNI.map((nume, li) => (
          <div key={nume} className="mb-1 flex items-center gap-1">
            {ani.map((an) => {
              const n = cauta(an, li);
              return (
                <span
                  key={an}
                  title={`${nume} ${an}: ${n} ${n === 1 ? "mașină" : "mașini"}`}
                  className="h-5 flex-1 rounded-[7px]"
                  style={{
                    backgroundColor: n ? ALBASTRU : URMA,
                    opacity: n ? 0.25 + (n / max) * 0.75 : 1,
                  }}
                />
              );
            })}
            <span className="w-9 shrink-0 pl-1 text-right text-[10px] font-medium text-slate-400">{nume}</span>
          </div>
        ))}
        <div className="mt-1.5 flex items-center gap-1">
          {ani.map((an) => (
            <span key={an} className="flex-1 text-center text-[10px] font-medium text-slate-400">{an}</span>
          ))}
          <span className="w-9 shrink-0" />
        </div>
      </div>
    </div>
  );
}

function Gol() {
  return <p className="py-10 text-center text-sm text-slate-400">Încă nu sunt date.</p>;
}
