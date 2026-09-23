"use client";

import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { InventoryDTO } from "@/types";

/** Fereastra de postare pe Instagram: previzualizare poze + text editabil. */
export function InstagramModal({
  item, caption, setCaption, photos, loading, posting, done, configured, onPost, onClose,
}: {
  item: InventoryDTO | null;
  caption: string;
  setCaption: (v: string) => void;
  photos: string[];
  loading: boolean;
  posting: boolean;
  done: { posted: boolean; note?: string } | null;
  configured: boolean | null;
  onPost: () => void;
  onClose: () => void;
}) {
  return (
  <Modal open={!!item} onClose={onClose} title="Postează pe Instagram"
    footer={
      done?.posted ? (
        <Button variant="secondary" onClick={onClose}>Închide</Button>
      ) : done && !done.posted ? (
        <>
          <Button variant="secondary" onClick={onClose}>Închide</Button>
          <Button onClick={() => { navigator.clipboard.writeText(caption); toast.success("Text copiat"); }}>Copiază textul</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose} disabled={posting}>Anulează</Button>
          <Button onClick={onPost} loading={posting} disabled={loading}>Postează</Button>
        </>
      )
    }>
    {loading ? (
      <div className="py-8 text-center text-slate-400">Se pregătește...</div>
    ) : done?.posted ? (
      <div className="py-6 text-center">
        <Badge color="green">Postat pe Instagram</Badge>
        <p className="mt-3 text-sm text-slate-600">Anunțul a fost publicat cu toate pozele.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {photos.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-slate-500">{photos.length} {photos.length === 1 ? "poză" : "poze"} (se postează toate)</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ig-caption" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Text anunț (îl poți edita)</label>
          <textarea id="ig-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={8}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
        {configured === false && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">Instagram nu e conectat — la „Postează” primești textul + pozele ca să le pui manual.</p>
        )}
        {done && !done.posted && done.note && <p className="text-xs text-slate-500">{done.note}</p>}
      </div>
    )}
  </Modal>
  );
}
