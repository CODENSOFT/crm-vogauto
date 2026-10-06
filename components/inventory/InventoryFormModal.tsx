"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Picker } from "@/components/ui/Picker";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/utils";
import { buildDescriptionTemplate } from "@/lib/listingTemplate";
import {
  BODY_TYPES, FUEL_TYPES, TRANSMISSIONS, DRIVE_TYPES, CAR_CONDITIONS, DOOR_OPTIONS, SEAT_OPTIONS,
  type InventoryDTO,
} from "@/types";

/** Un grup de câmpuri cu titlul lui. Formularul avea 20 de câmpuri la rând. */
function Sectiune({ titlu, nota, children }: { titlu: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{titlu}</h3>
        {nota && <span className="text-xs text-slate-400">{nota}</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

// Statusul se alege pe etichetă, dar se salvează ca valoare din baza de date.
const STATUS_LABEL: Record<string, string> = {
  preparing: "În pregătire",
  available: "Disponibilă",
  sold: "Vândută",
};
const STATUS_VALUE: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_LABEL).map(([k, v]) => [v, k])
);

const EMPTY = {
  brand: "", model: "", year: String(new Date().getFullYear()), vin: "", color: "", engine: "",
  bodyType: "", mileage: "", fuelType: "", transmission: "", driveType: "", condition: "", doors: "",
  power: "", seats: "",
  ownerName: "", ownerPhone: "", clientWantPrice: "", purchasePrice: "", sellPrice: "",
  status: "available", notes: "", listingDescription: "",
  // Reducerea se pune din pagina mașinii, nu de aici; o păstrăm ca să nu se
  // piardă la o editare obișnuită.
  oldPrice: "",
};

// Formular (modal) pentru adăugarea/editarea unei mașini din stoc + poze.
// Reutilizat de listă (adăugare) și de pagina de detaliu (editare).
export function InventoryFormModal({
  open, editing, onClose, onSaved, defaultStatus = "available",
}: {
  open: boolean;
  editing: InventoryDTO | null;
  onClose: () => void;
  onSaved: () => void;
  /** Statusul mașinii nou adăugate (secția din care se deschide formularul). */
  defaultStatus?: string;
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const ownerBox = useRef<HTMLDivElement>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  // Ce se întâmplă acum (încărcare poze, publicare), ca așteptarea să nu pară blocaj.
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStagedFiles([]);
    if (editing) {
      setForm({
        brand: editing.brand, model: editing.model, year: String(editing.year), vin: editing.vin ?? "", color: editing.color ?? "", engine: editing.engine ?? "",
        bodyType: editing.bodyType ?? "", mileage: String(editing.mileage ?? ""), fuelType: editing.fuelType ?? "",
        transmission: editing.transmission ?? "", driveType: editing.driveType ?? "",
        condition: editing.condition ?? "", doors: editing.doors ?? "",
        power: String(editing.power ?? ""), seats: editing.seats ?? "",
        ownerName: editing.ownerName, ownerPhone: editing.ownerPhone,
        clientWantPrice: String(editing.clientWantPrice ?? ""), purchasePrice: String(editing.purchasePrice ?? ""),
        sellPrice: String(editing.sellPrice ?? ""),
        oldPrice: editing.oldPrice ? String(editing.oldPrice) : "",
        status: editing.status, notes: editing.notes ?? "",
        listingDescription: editing.listingDescription ?? "",
      });
    } else {
      setForm({ ...EMPTY, status: defaultStatus });
    }
  }, [open, editing, defaultStatus]);

  // Sugestia „Parcarea" se închide la click în afara câmpului.
  useEffect(() => {
    if (!ownerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!ownerBox.current?.contains(e.target as Node)) setOwnerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ownerOpen]);

  // Textul de credit urmează prețul de la sine. Din clipa în care cineva scrie
  // în el, nu-l mai atingem: altfel și-ar pierde munca la fiecare ajustare.
  const descAtinsa = useRef(false);
  useEffect(() => {
    if (descAtinsa.current) return;
    const p = Number(form.sellPrice) || 0;
    setForm((f) => ({ ...f, listingDescription: buildDescriptionTemplate(p) }));
  }, [form.sellPrice]);

  useEffect(() => { if (open) descAtinsa.current = false; }, [open]);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isParcare = form.ownerName.trim().toLowerCase() === "parcarea";
  // La mașinile parcării costul e prețul de cumpărare, altfel prețul cerut de client.
  const cost = Number(isParcare ? form.purchasePrice : form.clientWantPrice) || 0;
  const markup = (Number(form.sellPrice) || 0) - cost;

  function addFiles(files: FileList | null) {
    if (!files) return;
    setStagedFiles((s) => [...s, ...Array.from(files).filter((f) => f.type.startsWith("image/"))]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeStaged(i: number) { setStagedFiles((s) => s.filter((_, idx) => idx !== i)); }

  /**
   * Urcă pozele alese, una după alta, arătând la care s-a ajuns. Fiecare eșec
   * se spune pe nume: înainte, o încărcare căzută lăsa mașina salvată fără
   * poze, fără ca motivul să fie clar.
   */
  async function uploadStaged(inventoryId: string, files: File[]): Promise<number> {
    let ok = 0;
    const failed: string[] = [];

    for (const [i, file] of files.entries()) {
      setProgress(`Se încarcă poza ${i + 1} din ${files.length}...`);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("inventoryId", inventoryId);
        const res = await fetch("/api/photos", { method: "POST", body: fd });
        if (res.ok) { ok++; continue; }
        const d = await res.json().catch(() => ({}));
        failed.push(`${file.name}: ${d.error || `eroare ${res.status}`}`);
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "conexiune întreruptă"}`);
      }
    }
    setProgress("");

    if (failed.length) {
      toast.error(
        `${failed.length} ${failed.length === 1 ? "poză nu s-a încărcat" : "poze nu s-au încărcat"}:\n${failed.join("\n")}`,
        { duration: 10000 },
      );
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
      // O singură sincronizare, după tot setul: mașina disponibilă cu poze
      // ajunge pe site fără să apese nimeni nimic.
      if (n) {
        setProgress("Se publică pe site...");
        const note = toast.loading("Se publică pe site...");
        try {
          await fetch(`/api/publish/site-sync/${invId}`, { method: "POST" });
          toast.success("Anunțul de pe site e la zi", { id: note });
        } catch (e) {
          const why = e instanceof Error ? e.message : "cauză necunoscută";
          toast.error(`Mașina e salvată, dar site-ul nu s-a actualizat: ${why}`, { id: note, duration: 9000 });
        }
        setProgress("");
      }
    }
    setSaving(false);
    toast.success(editing ? "Mașină actualizată" : "Mașină adăugată în stoc");
    // Raportăm doar ce s-a întâmplat cu adevărat: serverul spune dacă anunțul
    // de pe site a fost chiar actualizat.
    if (data.siteWarning) toast.error(data.siteWarning, { duration: 9000 });
    else if (data.siteHint) toast(data.siteHint, { duration: 9000, icon: "ℹ️" });
    else if (data.siteSynced) toast.success("Anunțul de pe site a fost actualizat");
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} size="xl"
      title={editing ? "Editează mașina" : "Adaugă mașină în stoc"}
      footer={<>
        {progress && <span className="mr-auto text-xs font-medium text-slate-500">{progress}</span>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button>
        <Button onClick={save} loading={saving}>Salvează</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <Sectiune titlu="Identificare">
          <Input label="Marcă *" value={form.brand} onChange={(e) => setF("brand", e.target.value)} />
          <Input label="Model *" value={form.model} onChange={(e) => setF("model", e.target.value)} />
          <Input label="An *" type="number" value={form.year} onChange={(e) => setF("year", e.target.value)} />
          <Input label="VIN" value={form.vin} onChange={(e) => setF("vin", e.target.value)} />
          <Input label="Culoare" value={form.color} onChange={(e) => setF("color", e.target.value)} placeholder="ex: Alb" />
          <Picker label="Status" value={STATUS_LABEL[form.status] ?? ""}
            onChange={(v) => setF("status", STATUS_VALUE[v] ?? "available")}
            options={Object.values(STATUS_LABEL)} placeholder="Disponibilă" />
        </Sectiune>

        <Sectiune titlu="Specificații" nota="apar pe anunțul de pe site și în filtrele lui">
          <Input label="Capacitate motor (cm³)" type="number" value={form.engine} onChange={(e) => setF("engine", e.target.value)} placeholder="ex: 2000" />
          <Input label="Putere (CP)" type="number" value={form.power} onChange={(e) => setF("power", e.target.value)} placeholder="ex: 490" />
          <Input label="Parcurs (km)" type="number" value={form.mileage} onChange={(e) => setF("mileage", e.target.value)} placeholder="ex: 90000" />
          <Picker label="Caroserie" value={form.bodyType}
            onChange={(v) => setF("bodyType", v)} options={BODY_TYPES} />
          <Picker label="Tip combustibil" value={form.fuelType}
            onChange={(v) => setF("fuelType", v)} options={FUEL_TYPES} />
          <Picker label="Transmisie" value={form.transmission}
            onChange={(v) => setF("transmission", v)} options={TRANSMISSIONS} />
          <Picker label="Tip tracțiune" value={form.driveType}
            onChange={(v) => setF("driveType", v)} options={DRIVE_TYPES} />
          <Picker label="Stare" value={form.condition}
            onChange={(v) => setF("condition", v)} options={CAR_CONDITIONS} />
          <Picker label="Uși" value={form.doors}
            onChange={(v) => setF("doors", v)} options={DOOR_OPTIONS} />
          <Picker label="Număr de locuri" value={form.seats}
            onChange={(v) => setF("seats", v)} options={SEAT_OPTIONS} />
        </Sectiune>

        <Sectiune titlu="Proprietar">
          <div className="relative flex flex-col gap-1.5" ref={ownerBox}>
            <label htmlFor="owner-name" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Proprietar *
            </label>
            <input
              id="owner-name"
              value={form.ownerName}
              onChange={(e) => setF("ownerName", e.target.value)}
              onFocus={() => setOwnerOpen(true)}
              placeholder="Numele clientului"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {ownerOpen && !isParcare && (
              <ul className="vg-pop absolute top-full z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-elevated">
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setF("ownerName", "Parcarea"); setOwnerOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-brand-tint hover:text-brand-dark"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-[9px] font-bold text-white">VA</span>
                    Parcarea
                    <span className="ml-auto text-xs text-slate-400">mașina proprie</span>
                  </button>
                </li>
              </ul>
            )}
          </div>
          <Input label={`Telefon proprietar${isParcare ? "" : " *"}`} value={form.ownerPhone} onChange={(e) => setF("ownerPhone", e.target.value)} disabled={isParcare} placeholder={isParcare ? "Nu e necesar (mașina parcării)" : ""} />
          <div className="hidden lg:block" />
        </Sectiune>

        <Sectiune titlu="Bani">
          <Input label="Preț cerut de client (€)" type="number" value={form.clientWantPrice} onChange={(e) => setF("clientWantPrice", e.target.value)} disabled={isParcare} placeholder={isParcare ? "Nu e necesar" : ""} />
          <Input label={`Preț cumpărare (€)${isParcare ? " *" : ""}`} type="number" value={form.purchasePrice} onChange={(e) => setF("purchasePrice", e.target.value)} disabled={!isParcare} placeholder={isParcare ? "Cât a plătit parcarea" : "Doar pentru mașinile parcării"} />
          <Input label="Preț de vânzare (€) *" type="number" value={form.sellPrice} onChange={(e) => setF("sellPrice", e.target.value)} />
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 sm:col-span-2 lg:col-span-3">
            {isParcare ? "Profit brut" : "Adaus parcare"}:{" "}
            <span className={`font-semibold ${markup >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(markup)}</span>
            <span className="text-slate-400"> (preț vânzare − {isParcare ? "preț cumpărare" : "preț client"})</span>
          </div>
        </Sectiune>

        <Sectiune titlu="Fotografii" nota="fără cel puțin una, mașina nu ajunge pe site">
          <div className="sm:col-span-2 lg:col-span-3">
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-white py-5 text-center text-sm text-slate-500 transition-colors hover:border-brand hover:text-brand">
              + Adaugă poze (poți selecta mai multe)
            </button>
            {stagedFiles.length > 0 && (
              <>
                <p className="mt-2 text-xs text-slate-500">
                  {stagedFiles.length} {stagedFiles.length === 1 ? "poză pregătită" : "poze pregătite"} — se încarcă la salvare
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {stagedFiles.map((f, i) => (
                    <div key={`${f.name}-${f.lastModified}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeStaged(i)}
                        className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white transition-colors hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Elimină">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Sectiune>

        <Sectiune titlu="Descriere anunț" nota="se completează singură din preț; o poți rescrie">
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="desc-anunt" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Text pentru site
              </label>
              <button type="button"
                onClick={() => { descAtinsa.current = false; setF("listingDescription", buildDescriptionTemplate(Number(form.sellPrice) || 0)); }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand">
                Reface șablonul
              </button>
            </div>
            <textarea id="desc-anunt" rows={10} value={form.listingDescription}
              onChange={(e) => { descAtinsa.current = true; setF("listingDescription", e.target.value); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
        </Sectiune>

        <Sectiune titlu="Note interne" nota="nu apar pe site">
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
          </div>
        </Sectiune>
      </div>
    </Modal>
  );
}
