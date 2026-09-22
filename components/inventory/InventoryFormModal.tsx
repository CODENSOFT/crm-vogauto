"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

const EMPTY = {
  brand: "", model: "", year: String(new Date().getFullYear()), vin: "", color: "", engine: "",
  ownerName: "", ownerPhone: "", clientWantPrice: "", sellPrice: "", status: "available", notes: "",
};

// Formular (modal) pentru adăugarea/editarea unei mașini din stoc + poze.
// Reutilizat de listă (adăugare) și de pagina de detaliu (editare).
export function InventoryFormModal({
  open, editing, onClose, onSaved,
}: {
  open: boolean;
  editing: InventoryDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStagedFiles([]);
    if (editing) {
      setForm({
        brand: editing.brand, model: editing.model, year: String(editing.year), vin: editing.vin ?? "", color: editing.color ?? "", engine: editing.engine ?? "",
        ownerName: editing.ownerName, ownerPhone: editing.ownerPhone,
        clientWantPrice: String(editing.clientWantPrice ?? ""), sellPrice: String(editing.sellPrice ?? ""),
        status: editing.status, notes: editing.notes ?? "",
      });
    } else {
      setForm({ ...EMPTY });
    }
  }, [open, editing]);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const markup = (Number(form.sellPrice) || 0) - (Number(form.clientWantPrice) || 0);
  const isParcare = form.ownerName.trim().toLowerCase() === "parcarea";

  function addFiles(files: FileList | null) {
    if (!files) return;
    setStagedFiles((s) => [...s, ...Array.from(files).filter((f) => f.type.startsWith("image/"))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeStaged(i: number) { setStagedFiles((s) => s.filter((_, idx) => idx !== i)); }

  async function uploadStaged(inventoryId: string, files: File[]): Promise<number> {
    let ok = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("inventoryId", inventoryId);
      const res = await fetch("/api/photos", { method: "POST", body: fd });
      if (res.ok) ok++;
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || `Eroare la ${file.name}`); }
    }
    return ok;
  }

  async function save() {
    if (!form.brand || !form.model || !form.year || !form.ownerName || !form.sellPrice || (!isParcare && !form.ownerPhone)) {
      toast.error("Completați câmpurile obligatorii."); return;
    }
    setSaving(true);
    const url = editing ? `/api/inventory/${editing._id}` : "/api/inventory";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setSaving(false); toast.error(data.error || "Eroare."); return; }

    const invId = editing ? editing._id : data.item?._id;
    if (stagedFiles.length && invId) {
      const n = await uploadStaged(invId, stagedFiles);
      if (n) toast.success(`${n} ${n === 1 ? "poză încărcată" : "poze încărcate"}`);
    }
    setSaving(false);
    toast.success(editing ? "Mașină actualizată" : "Mașină adăugată în stoc");
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editează mașina" : "Adaugă mașină în stoc"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Marcă *" value={form.brand} onChange={(e) => setF("brand", e.target.value)} />
        <Input label="Model *" value={form.model} onChange={(e) => setF("model", e.target.value)} />
        <Input label="An *" type="number" value={form.year} onChange={(e) => setF("year", e.target.value)} />
        <Input label="VIN" value={form.vin} onChange={(e) => setF("vin", e.target.value)} />
        <Input label="Culoare" value={form.color} onChange={(e) => setF("color", e.target.value)} placeholder="ex: Alb" />
        <Input label="Motor (capacitate)" value={form.engine} onChange={(e) => setF("engine", e.target.value)} placeholder="ex: 2.0 TDI" />
        <Input label="Proprietar *" value={form.ownerName} onChange={(e) => setF("ownerName", e.target.value)} list="inventory-owners" placeholder="Scrie sau alege „Parcarea”" />
        <datalist id="inventory-owners">
          <option value="Parcarea" />
        </datalist>
        <Input label={`Telefon proprietar${isParcare ? "" : " *"}`} value={form.ownerPhone} onChange={(e) => setF("ownerPhone", e.target.value)} disabled={isParcare} placeholder={isParcare ? "Nu e necesar (mașina parcării)" : ""} />
        <Input label="Preț cerut de client (€)" type="number" value={form.clientWantPrice} onChange={(e) => setF("clientWantPrice", e.target.value)} disabled={isParcare} placeholder={isParcare ? "Nu e necesar" : ""} />
        <Input label="Preț de vânzare (€) *" type="number" value={form.sellPrice} onChange={(e) => setF("sellPrice", e.target.value)} />
        <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
          <option value="available">Disponibilă</option>
          <option value="sold">Vândută</option>
        </Select>
        <div className="sm:col-span-2">
          <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
        </div>

        {/* Fotografii — se încarcă la salvarea mașinii. */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotografii</label>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <div onClick={() => fileRef.current?.click()}
            className="mt-1.5 cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-center text-sm text-slate-500 transition-colors hover:border-brand hover:text-brand">
            + Adaugă poze (poți selecta mai multe)
          </div>
          {stagedFiles.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {stagedFiles.map((f, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeStaged(i)}
                    className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100" aria-label="Elimină">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Adaus parcare: <span className={`font-semibold ${markup >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(markup)}</span>
          <span className="text-slate-400"> (preț vânzare − preț client)</span>
        </div>
      </div>
    </Modal>
  );
}
