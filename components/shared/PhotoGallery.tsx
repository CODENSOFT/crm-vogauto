"use client";

import { useState } from "react";

/**
 * Galeria unei mașini: fotografia mare, miniaturile și mărirea pe tot ecranul.
 * Folosită identic în pagina vânzării și în pagina mașinii din stoc.
 */
export function PhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(false);
  const main = urls[sel];

  return (
    <>
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-card">
        {main ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            <button type="button" onClick={() => setZoom(true)} aria-label="Mărește fotografia" className="h-full w-full cursor-zoom-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={main} alt={alt} className="h-full w-full object-cover" />
            </button>
          </div>
        ) : (
          /* Fără poze nu păstrăm caseta de 4:3: ar lăsa un gol mare degeaba.
             Doar o bandă joasă, cât să se înțeleagă că lipsesc. */
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-7 text-slate-400">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M21 15l-5-5L5 19" />
            </svg>
            <span className="text-sm">Fără fotografii</span>
          </div>
        )}
        {urls.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {urls.map((u, i) => (
              <button key={i} type="button" onClick={() => setSel(i)} aria-label={`Fotografia ${i + 1}`}
                className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg ring-2 ${i === sel ? "ring-brand" : "ring-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoom && main && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Închide" onClick={() => setZoom(false)} className="absolute inset-0 cursor-zoom-out bg-black/85" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt={alt} className="relative max-h-[92vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
