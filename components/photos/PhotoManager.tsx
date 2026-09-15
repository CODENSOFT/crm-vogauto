"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { PhotoDTO } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  carId?: string;
  inventoryId?: string;
  label?: string;
  onCountChange?: (count: number) => void;
}

export function PhotoManager({ open, onClose, carId, inventoryId, label, onCountChange }: Props) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [delTarget, setDelTarget] = useState<PhotoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const qs = carId ? `carId=${carId}` : `inventoryId=${inventoryId}`;

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const res = await fetch(`/api/photos?${qs}`);
    const data = await res.json();
    if (res.ok) { setPhotos(data.photos); onCountChange?.(data.photos.length); }
    setLoading(false);
  }, [open, qs, onCountChange]);

  useEffect(() => { load(); }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      if (carId) fd.append("carId", carId);
      if (inventoryId) fd.append("inventoryId", inventoryId);
      const res = await fetch("/api/photos", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) { setPhotos((p) => { const n = [...p, data.photo]; onCountChange?.(n.length); return n; }); ok++; }
      else toast.error(data.error || `Eroare la ${file.name}`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (ok) toast.success(`${ok} ${ok === 1 ? "poză încărcată" : "poze încărcate"}`);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/photos/${delTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setPhotos((p) => { const n = p.filter((x) => x._id !== delTarget._id); onCountChange?.(n.length); return n; });
    setDelTarget(null);
    toast.success("Poză ștearsă");
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Fotografii${label ? " · " + label : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Închide</Button>
            <Button onClick={() => inputRef.current?.click()} loading={uploading}>Adaugă poze</Button>
          </>
        }>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => onFiles(e.target.files)} />

        {loading ? (
          <div className="py-10 text-center text-slate-400">Se încarcă...</div>
        ) : photos.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-400 transition-colors hover:border-brand hover:text-brand"
          >
            Nicio poză. Apasă „Adaugă poze” sau click aici.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((ph) => (
              <div key={ph._id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                <button
                  onClick={() => setDelTarget(ph)}
                  className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  aria-label="Șterge poza"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {uploading && <p className="mt-3 text-center text-sm text-slate-500">Se încarcă pozele...</p>}
      </Modal>

      <ConfirmDialog open={!!delTarget} title="Ștergere poză"
        message="Sigur ștergeți această poză?" confirmLabel="Șterge"
        loading={deleting} onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
    </>
  );
}
