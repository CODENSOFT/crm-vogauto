import { formatDateShort } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/timeline";

/**
 * Istoricul mașinii, ca linie de timp. Stă sub galerie, pe lățimea ei: pe toată
 * pagina însemna o bandă îngustă de text într-un spațiu enorm.
 *
 * Aceeași componentă în pagina mașinii din stoc și în pagina vânzării.
 */
export function Istoric({ timeline }: { timeline: TimelineEvent[] }) {
  if (timeline.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Istoricul mașinii</h3>
      <ol className="relative ml-2 border-l-2 border-slate-100">
        {timeline.map((e, i) => (
          <li key={i} className="mb-4 ml-4 last:mb-0">
            <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand ring-4 ring-white" />
            <div className="text-sm font-medium text-slate-800">{e.title}</div>
            {e.detail && <div className="text-xs text-slate-500">{e.detail}</div>}
            {e.date && <div className="text-[11px] text-slate-400">{formatDateShort(e.date)}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
