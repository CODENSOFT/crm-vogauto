"use client";

import { useState } from "react";

// Celulă editabilă la click (text/număr/dată). Salvează la blur sau Enter.
export function InlineEdit({
  inputValue,
  display,
  type = "text",
  onSave,
  width = "w-28",
  align = "left",
}: {
  inputValue: string;
  display: React.ReactNode;
  type?: "text" | "number" | "date";
  onSave: (v: string) => void;
  width?: string;
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(inputValue);

  function start() { setVal(inputValue); setEditing(true); }
  function commit() { setEditing(false); if (val !== inputValue) onSave(val); }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={`${width} rounded-md border border-brand bg-white px-1.5 py-1 text-sm outline-none focus:ring-2 focus:ring-brand/20`}
      />
    );
  }
  return (
    <span
      onClick={start}
      title="Click pentru editare"
      className={`block min-h-[1.5rem] cursor-pointer rounded-md px-1.5 py-0.5 transition-colors hover:bg-brand-tint/60 ${align === "right" ? "text-right" : ""}`}
    >
      {display}
    </span>
  );
}

// Select inline sub formă de pastilă colorată (fără chenar de input clasic).
export function InlinePill({
  value,
  onChange,
  options,
  className = "bg-slate-100 text-slate-600",
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-6 text-xs font-semibold outline-none ring-1 ring-inset ring-black/5 focus:ring-2 focus:ring-brand/30 ${className}`}
    >
      {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
