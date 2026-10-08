"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

interface LinkState {
  connected: boolean;
  configured: boolean;
  botUsername: string | null;
}

// Conectarea contului de administrator la botul de Telegram: CRM-ul generează
// un cod de 6 cifre, adminul îl trimite botului, iar botul leagă conturile.
export function TelegramCard({ worker = false }: { worker?: boolean }) {
  const [state, setState] = useState<LinkState | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/telegram/link");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setCode(data.code);
  }

  async function disconnect() {
    setBusy(true);
    const res = await fetch("/api/telegram/link", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { toast.error("Eroare."); return; }
    setCode(null);
    toast.success("Telegram deconectat");
    load();
  }

  if (!state) return null;

  if (!state.configured) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Botul de Telegram nu este configurat (lipsește <code>TELEGRAM_BOT_TOKEN</code>).
      </div>
    );
  }

  const botLink = state.botUsername ? `https://t.me/${state.botUsername}` : null;

  return (
    <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-black/5">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.5.5-1 .5l.3-4.6 8.3-7.5c.4-.3-.1-.5-.6-.2L7.4 13.1 2.9 11.7c-1-.3-1-1 .2-1.5l17.4-6.7c.8-.3 1.5.2 1.4 1z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {worker ? "Notificări pe Telegram" : "Bot Telegram — creare sarcini din chat"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {worker ? (
                "Conectează-ți contul ca să primești un mesaj pe Telegram de fiecare dată când ți se atribuie o sarcină nouă."
              ) : (
                <>Scrii botului <code className="rounded bg-slate-100 px-1">spalat Audi A5 2026 alb Ion maine</code> și
                sarcina apare în CRM, cu mașina și responsabilul potrivite automat.</>
              )}
            </p>
            <p className="mt-1.5 text-xs">
              {state.connected
                ? <span className="font-semibold text-emerald-700">● Cont conectat</span>
                : <span className="font-semibold text-slate-400">○ Neconectat</span>}
              {botLink && (
                <>
                  {" · "}
                  <a href={botLink} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    @{state.botUsername}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={generate} loading={busy}>
            {state.connected ? "Cod nou" : "Conectează Telegram"}
          </Button>
          {state.connected && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={disconnect} disabled={busy}>
              Deconectează
            </Button>
          )}
        </div>
      </div>

      {code && (
        <div className="mt-4 rounded-lg border border-brand/30 bg-brand-tint/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Codul tău (valabil 10 minute)</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">{code}</p>
          <p className="mt-2 text-xs text-slate-600">
            Deschide {botLink ? <a href={botLink} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">@{state.botUsername}</a> : "botul"} în
            Telegram, apasă <b>Start</b> și trimite-i acest cod.
          </p>
        </div>
      )}
    </div>
  );
}
