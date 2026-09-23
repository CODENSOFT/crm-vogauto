"use client";

import { Button } from "@/components/ui/Button";

/** Antetul paginii Sarcini: titlu, comutatorul În lucru / Finalizate, adăugare. */
export function TaskHeader({
  isAdmin, view, setView, onAdd,
}: {
  isAdmin: boolean;
  view: "active" | "done";
  setView: (v: "active" | "done") => void;
  onAdd: () => void;
}) {
  return (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {isAdmin ? "Sarcini" : "Sarcinile mele"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isAdmin
          ? "Atribuie sarcini lucrătorilor și urmărește programul zilnic."
          : "Sarcinile tale pe zi. Marchează progresul pe măsură ce le finalizezi."}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setView("active")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${view === "active" ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          În lucru
        </button>
        <button
          type="button"
          onClick={() => setView("done")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${view === "done" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Finalizate
        </button>
      </div>
      <Button onClick={onAdd}>Sarcină nouă</Button>
    </div>
  </div>
  );
}
