"use client";

import { useState, useRef, useEffect } from "react";

interface Worker { _id: string; fullName: string }

// Selector cu mai mulți responsabili — chips + listă cu bifare.
export function MultiUserPicker({
  value,
  onChange,
  workers,
  label = "Responsabili",
  placeholder = "— alege unul sau mai mulți —",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  workers: Worker[];
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = workers.filter((w) => value.includes(w._id));
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</label>
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[38px] cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus-within:border-brand"
      >
        {selected.length === 0 ? (
          <span className="px-1 text-slate-400">{placeholder}</span>
        ) : (
          selected.map((w) => (
            <span key={w._id} className="inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-xs font-medium text-brand-dark">
              {w.fullName}
              <button type="button" onClick={(e) => { e.stopPropagation(); toggle(w._id); }} className="text-brand/70 hover:text-red-600" aria-label="Elimină">×</button>
            </span>
          ))
        )}
        <svg className="ml-auto h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </div>
      {open && (
        <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-elevated">
          {workers.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400">Niciun angajat.</div>
          ) : workers.map((w) => (
            <label key={w._id} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={value.includes(w._id)} onChange={() => toggle(w._id)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30" />
              <span className="text-slate-800">{w.fullName}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
