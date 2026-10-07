"use client";

import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { InventoryDTO } from "@/types";

export interface PlatformResult {
  platform: "facebook" | "instagram";
  posted: boolean;
  error?: string;
  /** Rețeaua nu e conectată: textul și pozele se postează manual. */
  manual?: boolean;
}

const NAME: Record<string, string> = { facebook: "Facebook", instagram: "Instagram" };

/** O linie de rezultat per rețea, după postare. */
function ResultRow({ r }: { r: PlatformResult }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <span className="text-sm font-medium text-slate-800">{NAME[r.platform]}</span>
      {r.posted ? (
        <Badge color="green">Publicat</Badge>
      ) : r.manual ? (
        <Badge color="gray">Neconectat — postează manual</Badge>
      ) : (
        <span className="max-w-[55%] truncate text-xs font-medium text-red-600" title={r.error}>
          {r.error || "A eșuat"}
        </span>
      )}
    </li>
  );
}

/**
 * Fereastra de postare pe rețele: un singur text și o singură apăsare,
 * iar anunțul pleacă pe Facebook și Instagram în același timp.
 */
export function SocialPostModal({
  item, caption, setCaption, photos, igPoze, loading, posting, results,
  fbReady, igReady, onPost, onClose,
}: {
  item: InventoryDTO | null;
  caption: string;
  setCaption: (v: string) => void;
  photos: string[];
  /** Câte poze acceptă Instagram din ele. */
  igPoze?: number;
  loading: boolean;
  posting: boolean;
  /** Rezultatele postării; null înainte de apăsare. */
  results: PlatformResult[] | null;
  fbReady: boolean | null;
  igReady: boolean | null;
  onPost: () => void;
  onClose: () => void;
}) {
  const anyPosted = results?.some((r) => r.posted) ?? false;
  const notReady = [
    fbReady === false ? "Facebook" : null,
    igReady === false ? "Instagram" : null,
  ].filter(Boolean);

  return (
    <Modal open={!!item} onClose={onClose} title="Postează pe Facebook și Instagram"
      footer={
        results ? (
          <>
            <Button variant="secondary" onClick={onClose}>Închide</Button>
            {!results.every((r) => r.posted) && (
              <Button onClick={() => { navigator.clipboard.writeText(caption); toast.success("Text copiat"); }}>
                Copiază textul
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={posting}>Anulează</Button>
            <Button onClick={onPost} loading={posting} disabled={loading}>Postează pe ambele</Button>
          </>
        )
      }>
      {loading ? (
        <div className="py-8 text-center text-slate-400">Se pregătește...</div>
      ) : results ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {results.map((r) => <ResultRow key={r.platform} r={r} />)}
          </ul>
          {anyPosted && (
            <p className="text-sm text-slate-600">Anunțul a fost publicat cu toate pozele.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {photos.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-slate-500">
                {photos.length} {photos.length === 1 ? "poză" : "poze"}
                {igPoze !== undefined && igPoze < photos.length ? (
                  <> — pe Facebook toate, pe Instagram {igPoze === 0 ? "niciuna" : igPoze}
                    <span className="ml-1 font-normal text-amber-600">
                      ({photos.length - igPoze} cu format nepotrivit: Instagram cere între 4:5 și 1.91:1, minimum 320px)
                    </span>
                  </>
                ) : " — se postează toate, pe ambele rețele"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="social-caption" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Text anunț (același pe ambele, îl poți edita)
            </label>
            <textarea id="social-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={9}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          {notReady.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {notReady.join(" și ")} {notReady.length > 1 ? "nu sunt conectate" : "nu e conectat"} — pentru
              {notReady.length > 1 ? " ele" : " el"} primești textul și pozele ca să le pui manual.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
