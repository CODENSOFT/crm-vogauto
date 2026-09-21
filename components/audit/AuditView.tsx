"use client";

import { useState, useEffect, useCallback } from "react";
import { Pagination, Badge } from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS, type AuditDTO } from "@/types";

const label = (a: string) => AUDIT_ACTION_LABELS[a] ?? a;

function actionColor(a: string): "green" | "red" | "blue" | "yellow" | "gray" {
  if (a === "LOGIN_SUCCESS") return "green";
  if (a.includes("FAILED") || a.includes("DELETE")) return "red";
  if (a.startsWith("CREATE") || a.startsWith("EDIT") || a.startsWith("PUBLISH")) return "blue";
  if (a === "REVEAL_PHONE" || a === "DOWNLOAD_EXCEL") return "yellow";
  return "gray";
}

// Timp relativ scurt: „acum 5 min", „acum 2 h", „ieri".
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 30) return `acum ${d} zile`;
  return "";
}

// Marchează ca suspecte autentificările din aceeași zi, același user, orașe diferite.
function suspiciousIds(logs: AuditDTO[]): Set<string> {
  const byKey: Record<string, Set<string>> = {};
  for (const l of logs) {
    if (l.action !== "LOGIN_SUCCESS" || !l.locationCity || l.locationCity === "unknown") continue;
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    (byKey[`${l.userName}|${day}`] ??= new Set()).add(l.locationCity);
  }
  const flagged = new Set<string>();
  for (const l of logs) {
    if (l.action !== "LOGIN_SUCCESS") continue;
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    if (byKey[`${l.userName}|${day}`] && byKey[`${l.userName}|${day}`].size > 1) flagged.add(l._id);
  }
  return flagged;
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (user) p.set("user", user);
    if (action) p.set("action", action);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    const res = await fetch(`/api/audit?${p}`);
    const data = await res.json();
    if (res.ok) { setLogs(data.logs); setTotal(data.total); }
    setLoading(false);
  }, [page, user, action, dateFrom, dateTo]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(1), [user, action, dateFrom, dateTo]);

  const flagged = suspiciousIds(logs);
  const logins = logs.filter((l) => l.action === "LOGIN_SUCCESS").length;
  const failed = logs.filter((l) => l.action === "LOGIN_FAILED").length;
  const uniqueIps = new Set(logs.map((l) => l.ipAddress).filter((x) => x && x !== "unknown")).size;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jurnal de audit</h1>
        <p className="mt-1 text-sm text-slate-500">Toate acțiunile din sistem: cine, ce, când, de pe ce IP și dispozitiv.</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Evenimente (total)" value={total} />
        <Stat label="Autentificări (pagină)" value={logins} tone="text-emerald-700" />
        <Stat label="Eșuate (pagină)" value={failed} tone={failed ? "text-red-600" : undefined} />
        <Stat label="IP-uri unice (pagină)" value={uniqueIps} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-4">
        <Input label="Utilizator" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Nume..." />
        <Select label="Acțiune" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Toate</option>
          {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{label(a)}</option>)}
        </Select>
        <Input label="De la" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="Până la" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Utilizator", "Acțiune", "Adresă IP", "Locație", "Dispozitiv", "Când"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Niciun eveniment.</td></tr>
              ) : logs.map((l) => (
                <tr key={l._id} className={flagged.has(l._id) ? "bg-amber-50" : "transition-colors hover:bg-brand-tint/40"}>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      {l.userName || "—"}
                      {flagged.has(l._id) && <Badge color="yellow">suspect</Badge>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge color={actionColor(l.action)}>{label(l.action)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="font-mono text-xs font-semibold text-slate-800">{l.ipAddress || "—"}</div>
                    {l.locationIsp && <div className="max-w-[13rem] truncate text-[11px] text-slate-400" title={l.locationIsp}>{l.locationIsp}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="text-slate-800">{l.locationCity && l.locationCity !== "unknown" ? l.locationCity : "—"}</div>
                    <div className="text-[11px] text-slate-400">{l.locationCountry && l.locationCountry !== "unknown" ? l.locationCountry : ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="text-slate-800">{l.device || "—"}</div>
                    <div className="text-[11px] text-slate-400">{l.browser || ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="text-slate-700">{relTime(l.createdAt)}</div>
                    <div className="text-[11px] text-slate-400">{formatDate(l.createdAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={50} total={total} onPageChange={setPage} />
    </div>
  );
}
