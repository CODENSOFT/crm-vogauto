"use client";

import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

const IconGlobe = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>
);
const IconFacebook = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6c-.3-.04-1.3-.12-2.45-.12-2.43 0-4.1 1.48-4.1 4.2v2.22H7.4V14h2.75v8h3.35z" />
  </svg>
);
const IconInstagram = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);


function PlatformToggle({ on, onClick, label, color, icon, busy }: {
  on: boolean; onClick: () => void; label: string; color: "blue" | "orange";
  icon?: React.ReactNode; busy?: boolean;
}) {
  const filled = color === "blue" ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "bg-orange-500 text-white shadow-sm hover:bg-orange-600";
  const outline = color === "blue" ? "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100";
  // Cât se publică, butonul își schimbă și culoarea, nu doar textul: câteva
  // secunde de așteptare fără nicio mișcare par o apăsare care n-a mers.
  const working = color === "blue"
    ? "bg-blue-600 text-white shadow-sm"
    : "bg-orange-500 text-white shadow-sm";

  return (
    <div className="min-w-[116px]">
      <button onClick={onClick} disabled={busy} aria-busy={busy}
        title={busy ? `Se publică pe ${label}...` : on ? `Retrage de pe ${label}` : `Publică pe ${label}`}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait ${busy ? working : on ? filled : outline}`}>
        {busy
          ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          : icon}
        {busy ? "Se publică..." : on ? `${label} ✓` : label}
      </button>
      {busy && (
        <>
          {/* Bară nedeterminată: arată că lucrarea e în curs, nu cât a mai rămas. */}
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-200">
            <span className="vg-indeterminate block h-full w-1/3 rounded-full bg-blue-600" />
          </span>
          <span className="sr-only" aria-live="polite">Se publică pe {label}</span>
        </>
      )}
    </div>
  );
}

/** Tabelul de publicare: comutatoare per canal + acțiuni pe fiecare mașină. */
export function PublishingTable({
  items, onToggle, onListing, onPhotos, onSocial, onUnsocial, busy,
}: {
  items: InventoryDTO[];
  onToggle: (it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) => void;
  /** Cheia „id:canal" aflată în lucru, ca să nu se apese de două ori. */
  busy?: string | null;
  onListing: (it: InventoryDTO) => void;
  onPhotos: (it: InventoryDTO) => void;
  onSocial: (it: InventoryDTO) => void;
  /** Retrage postarea deja publicată. */
  onUnsocial: (it: InventoryDTO) => void;
}) {
  return (
  <div className="overflow-x-auto rounded-card border border-slate-200/70 bg-white shadow-card">
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      <thead className="bg-slate-50/80">
        <tr>
          {["Foto", "Mașină", "Preț", "Site", "999.md", "Facebook + Instagram", "Acțiuni"].map((h, i) => (
            <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Nicio mașină disponibilă în stoc.</td></tr>
        ) : items.map((it) => {
          const hasPhoto = (it.photoCount ?? 0) > 0;
          return (
            <tr key={it._id}
              className={`transition-[background-color,opacity] duration-200 hover:bg-brand-tint/40 ${
                busy?.startsWith(`${it._id}:`) ? "bg-blue-50/60" : ""}`}>
              <td className="px-3 py-2">
                <div className="relative h-11 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  {it.primaryPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.primaryPhoto} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : <span className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">fără</span>}
                  {(it.photoCount ?? 0) > 1 && <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[8px] text-white">{it.photoCount}</span>}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <div className="font-medium text-slate-800">{it.brand} {it.model} <span className="text-slate-400">{it.year}</span></div>
                {!hasPhoto && <div className="text-[11px] font-medium text-amber-600">Adaugă poze ca să publici</div>}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {!!it.oldPrice && it.oldPrice > it.sellPrice && (
                  <div className="text-xs font-medium text-slate-400 line-through">{formatMoney(it.oldPrice)}</div>
                )}
                <div className="font-semibold text-slate-900">{formatMoney(it.sellPrice)}</div>
              </td>
              <td className="px-3 py-2.5">
                {/* „Publicat" înseamnă că există anunț pe site, nu doar că
                    bifa e pusă. Altfel comutatorul arăta pornit degeaba, iar
                    apăsarea îl oprea în loc să publice. */}
                <PlatformToggle on={!!(it.publishedSite && it.wpPostId)} onClick={() => onToggle(it, "publishedSite", "Site")} label="Site" color="blue" icon={<IconGlobe />} busy={busy === `${it._id}:publishedSite`} />
                {it.publishedSite && it.wpUrl && (
                  <a href={it.wpUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-[11px] font-medium text-brand hover:underline">vezi anunțul →</a>
                )}
              </td>
              <td className="px-3 py-2.5"><PlatformToggle on={!!it.published999} onClick={() => onToggle(it, "published999", "999.md")} label="999.md" color="orange" busy={busy === `${it._id}:published999`} /></td>
              <td className="px-3 py-2.5">
                {/* Un singur buton, ca la Site: apasă o dată și se publică,
                    apasă din nou și se retrage. */}
                {it.fbPostId || it.igPostId ? (
                  <button onClick={() => onUnsocial(it)} title="Retrage postarea"
                    disabled={busy === `${it._id}:social`}
                    className="inline-flex min-w-[116px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70">
                    {busy === `${it._id}:social` ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : "✓"}
                    {busy === `${it._id}:social` ? "Se retrage..." : "Postat"}
                  </button>
                ) : (
                  <button onClick={() => onSocial(it)} title="Pregătește și postează pe Facebook și Instagram"
                    disabled={busy === `${it._id}:social`}
                    className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
                    <span className="flex items-center gap-1">
                      <span className="text-[#4e9bff]"><IconFacebook /></span>
                      <span className="text-[#f58aa8]"><IconInstagram /></span>
                    </span>
                    Postează
                  </button>
                )}
                {it.igPermalink && (
                  <a href={it.igPermalink} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-[11px] font-medium text-brand hover:underline">vezi pe Instagram →</a>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => onPhotos(it)}>Poze</Button>
                <Button variant="ghost" size="sm" className="text-brand" onClick={() => onListing(it)}>Anunț</Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
  );
}
