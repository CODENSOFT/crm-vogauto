import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

/**
 * Cifrele secțiunii, deasupra listei.
 *
 * Înainte trebuia citită toată tabela ca să afli câte mașini sunt și cât
 * valorează stocul. Aici se văd dintr-o privire, iar ultimul cartonaș arată
 * câte mașini nu pot fi publicate — e singurul lucru de pe pagină care cere
 * o acțiune.
 */
export function StockSummary({ items, prep }: { items: InventoryDTO[]; prep: boolean }) {
  const valoare = items.reduce((s, i) => s + Number(i.sellPrice || 0), 0);
  const cheltuieli = items.reduce((s, i) => s + Number(i.expensesTotal || 0), 0);
  const adaus = items.reduce((s, i) => s + Number(i.netMargin ?? i.markup ?? 0), 0);
  const faraPoze = items.filter((i) => !(i.photoCount ?? 0)).length;

  const carduri: { eticheta: string; valoare: string; nota?: string; ton?: string }[] = prep
    ? [
        { eticheta: "În pregătire", valoare: String(items.length) },
        { eticheta: "Valoare la vânzare", valoare: formatMoney(valoare) },
        { eticheta: "Cheltuieli adunate", valoare: formatMoney(cheltuieli), ton: "text-amber-700" },
      ]
    : [
        { eticheta: "Mașini în stoc", valoare: String(items.length) },
        { eticheta: "Valoare stoc", valoare: formatMoney(valoare) },
        { eticheta: "Adaus net total", valoare: formatMoney(adaus), ton: adaus >= 0 ? "text-emerald-700" : "text-red-600" },
      ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {carduri.map((c) => (
        <div key={c.eticheta} className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c.eticheta}</p>
          <p className={`mt-1 text-xl font-bold tracking-tight ${c.ton ?? "text-slate-900"}`}>{c.valoare}</p>
        </div>
      ))}
      <div className={`rounded-xl border p-4 shadow-card ${
        faraPoze ? "border-amber-200 bg-amber-50" : "border-slate-200/70 bg-white"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${faraPoze ? "text-amber-700" : "text-slate-500"}`}>
          Fără fotografii
        </p>
        <p className={`mt-1 text-xl font-bold tracking-tight ${faraPoze ? "text-amber-800" : "text-slate-900"}`}>
          {faraPoze}
        </p>
        {faraPoze > 0 && (
          <p className="mt-0.5 text-xs text-amber-700">nu ajung pe site până nu au poze</p>
        )}
      </div>
    </div>
  );
}
