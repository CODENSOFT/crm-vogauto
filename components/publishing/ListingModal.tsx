"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { buildDescriptionTemplate } from "@/lib/listingTemplate";
import type { InventoryDTO } from "@/types";

/** Editorul de titlu și descriere pentru anunțul unei mașini. */
export function ListingModal({
  target, title, setTitle, desc, setDesc, saving, onClose, onSave,
}: {
  target: InventoryDTO | null;
  title: string;
  setTitle: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
  <Modal open={!!target} onClose={onClose} title="Anunț pentru publicare"
    footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={onSave} loading={saving}>Salvează</Button></>}>
    <div className="flex flex-col gap-3">
      <Input label="Titlu anunț" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="listing-desc" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Descriere</label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => target && setDesc(buildDescriptionTemplate(Number(target.sellPrice)))}
            title="Reface textul standard de credit, cu prețul actual al mașinii"
          >
            Reface șablonul
          </Button>
        </div>
        <textarea id="listing-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={14}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder="Dotări, stare, detalii..." />
        <span className="text-xs text-slate-400">
          Textul de credit e completat automat, cu prețul acestei mașini. Poți scrie peste el;
          {" "}{'„Reface șablonul”'} îl aduce înapoi, cu prețul de acum.
        </span>
      </div>
    </div>
  </Modal>
  );
}
