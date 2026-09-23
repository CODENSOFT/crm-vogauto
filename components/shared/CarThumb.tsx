import type { CSSProperties } from "react";

/** Miniatura unei mașini, cu numărul de poze în colț. Folosită în liste și tabele. */
export function CarThumb({
  url,
  count,
  className = "h-12 w-16",
  style,
}: {
  url?: string | null;
  count?: number | null;
  /** Dimensiunea (clase Tailwind) — diferă între tabel și lista de pe telefon. */
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 ${className}`} style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">fără</span>
      )}
      {(count ?? 0) > 1 && (
        <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[9px] text-white">{count}</span>
      )}
    </div>
  );
}
