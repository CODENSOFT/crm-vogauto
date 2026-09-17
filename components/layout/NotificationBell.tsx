"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/ui/Icons";
import { formatDate } from "@/lib/utils";

interface Notif {
  _id: string; type: string; title: string; body?: string | null; link?: string | null; isRead: boolean; createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = await res.json();
      setItems(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // reîmprospătare la 60s
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) {
      setUnread(0);
      setItems((list) => list.map((n) => ({ ...n, isRead: true })));
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => {});
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100" aria-label="Notificări">
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 max-h-[70vh] w-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-elevated">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Notificări</div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Nicio notificare.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {items.map((n) => (
                <li key={n._id}>
                  <button
                    onClick={() => { setOpen(false); if (n.link) router.push(n.link); }}
                    className="block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="text-sm font-medium text-slate-800">{n.title}</div>
                    {n.body && <div className="mt-0.5 text-xs text-slate-500">{n.body}</div>}
                    <div className="mt-1 text-[11px] text-slate-400">{formatDate(n.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
