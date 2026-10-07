"use client";

import { Picker } from "@/components/ui/Picker";

export type SortKey = "recente" | "pret-mare" | "pret-mic" | "adaus" | "marca";

/** Etichetele de sortare, cu valoarea din spate. Ordinea e cea din listă. */
export const SORT_LABELS: Record<SortKey, string> = {
  recente: "Cele mai noi",
  "pret-mare": "Preț: mare → mic",
  "pret-mic": "Preț: mic → mare",
  adaus: "Adaus net",
  marca: "Marcă (A–Z)",
};

const SORT_VALUES = Object.fromEntries(
  Object.entries(SORT_LABELS).map(([k, v]) => [v, k as SortKey])
) as Record<string, SortKey>;

/**
 * Căutarea și sortarea, pe un singur rând.
 *
 * Căutarea ocupa înainte un cartonaș propriu cât jumătate de ecran, cu
 * eticheta „Căutare" deasupra unui câmp care spunea deja ce face.
 */
export function StockToolbar({
  search, setSearch, sort, setSort, total,
}: {
  search: string;
  setSearch: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută marcă, model, VIN, proprietar"
          aria-label="Caută în stoc"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="w-full sm:w-52">
        <Picker
          value={SORT_LABELS[sort]}
          onChange={(v) => setSort(SORT_VALUES[v] ?? "recente")}
          options={Object.values(SORT_LABELS)}
          placeholder="Cele mai noi"
        />
      </div>

      {search && (
        <span className="text-xs text-slate-500">
          {total} {total === 1 ? "rezultat" : "rezultate"}
        </span>
      )}
    </div>
  );
}
