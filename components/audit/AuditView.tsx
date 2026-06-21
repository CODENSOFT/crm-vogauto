"use client";

import { useState, useEffect, useCallback } from "react";
import { Pagination, Badge } from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS, type AuditDTO } from "@/types";

const label = (a: string) => AUDIT_ACTION_LABELS[a] ?? a;

// Marchează ca suspecte log-urile de login din aceeași zi, același user,
// dar din orașe diferite.
function suspiciousIds(logs: AuditDTO[]): Set<string> {
  const byKey: Record<string, Set<string>> = {};
  for (const l of logs) {
    if (l.action !== "LOGIN_SUCCESS" || !l.locationCity || l.locationCity === "unknown") continue;
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    const key = `${l.userName}|${day}`;
    (byKey[key] ??= new Set()).add(l.locationCity);
  }
  const flagged = new Set<string>();
  for (const l of logs) {
    if (l.action !== "LOGIN_SUCCESS") continue;
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    const key = `${l.userName}|${day}`;
    if (byKey[key] && byKey[key].size > 1) flagged.add(l._id);
  }
  return flagged;
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

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => setPage(1), [user, action, dateFrom, dateTo]);

  const flagged = suspiciousIds(logs);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Jurnal audit</h1>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-4">
        <Input label="Utilizator" value={user} onChange={(e) => setUser(e.target.value)} />
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
                {["Utilizator", "Acțiune", "IP", "Oraș", "Țară", "Dispozitiv", "Browser", "Data"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Niciun eveniment.</td></tr>
              ) : logs.map((l) => (
                <tr key={l._id} className={flagged.has(l._id) ? "bg-amber-50" : "transition-colors hover:bg-brand-tint/50"}>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
                    <span className="flex items-center gap-2">{l.userName || "—"}
                    {flagged.has(l._id) && <Badge color="yellow">suspect</Badge>}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={l.action.includes("FAILED") || l.action.includes("DELETE") ? "red" : "blue"}>
                      {label(l.action)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{l.ipAddress || "—"}</td>
                  <td className="px-3 py-2">{l.locationCity || "—"}</td>
                  <td className="px-3 py-2">{l.locationCountry || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{l.device || "—"}</td>
                  <td className="px-3 py-2">{l.browser || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(l.createdAt)}</td>
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
