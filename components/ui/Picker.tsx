"use client";

import { useState, useRef, useEffect } from "react";

/**
 * Selector cu listă proprie, în locul `<select>`-ului nativ: lista nativă nu
 * poate fi stilizată și arată diferit în fiecare browser. Acesta arată la fel
 * peste tot și se folosește și de la tastatură.
 */
export function Picker({
  label,
  value,
  onChange,
  options,
  placeholder = "— alege —",
  id,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** Textul afișat când nu e aleasă nicio opțiune (valoarea rămâne ""). */
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Lista include varianta „necompletat", ca să se poată goli alegerea.
  const items = ["", ...options];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(Math.max(0, items.indexOf(value))); return; }
      setActive((i) => (e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1)));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) pick(items[active]); else { setOpen(true); setActive(Math.max(0, items.indexOf(value))); }
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={boxRef}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          onClick={() => { setOpen((o) => !o); setActive(Math.max(0, items.indexOf(value))); }}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors ${open ? "border-brand ring-2 ring-brand/20" : "border-slate-300 hover:border-slate-400"}`}
        >
          <span className={value ? "truncate text-slate-900" : "truncate text-slate-400"}>
            {value || placeholder}
          </span>
          <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {open && (
          /* Tiparul ARIA „listbox", nu <select>: lista nativă nu poate fi
             stilizată. Rolurile rămân ca cititoarele de ecran să anunțe
             „listă cu N opțiuni, X selectat", nu un șir de butoane. */
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          <div
            role="listbox"
            aria-label={label}
            className="vg-pop absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-elevated"
          >
            {items.map((v, i) => {
              const selected = v === value;
              return (
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                <button
                    key={v || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); pick(v); }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      selected ? "bg-brand-tint font-medium text-brand-dark"
                        : i === active ? "bg-slate-100 text-slate-800" : "text-slate-700"
                    }`}
                  >
                    <span className={v ? "" : "text-slate-400"}>{v || placeholder}</span>
                    {selected && (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
