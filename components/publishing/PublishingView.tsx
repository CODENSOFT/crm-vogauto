"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { PhotoManager } from "@/components/photos/PhotoManager";
import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

const IconGlobe = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>
);
const IconInstagram = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
);

// Buton de publicare în stilul platformei (Site = albastru, 999.md = portocaliu).
function PlatformToggle({ on, onClick, label, color, icon }: {
  on: boolean; onClick: () => void; label: string; color: "blue" | "orange"; icon?: React.ReactNode;
}) {
  const filled = color === "blue" ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "bg-orange-500 text-white shadow-sm hover:bg-orange-600";
  const outline = color === "blue" ? "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100";
  return (
    <button onClick={onClick} title={on ? `Retrage de pe ${label}` : `Publică pe ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${on ? filled : outline}`}>
      {icon}
      {on ? `${label} ✓` : label}
    </button>
  );
}

export function PublishingView() {
  const [items, setItems] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [listingTarget, setListingTarget] = useState<InventoryDTO | null>(null);
  const [lTitle, setLTitle] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [savingL, setSavingL] = useState(false);

  const [photoTarget, setPhotoTarget] = useState<InventoryDTO | null>(null);

  const [igItem, setIgItem] = useState<InventoryDTO | null>(null);
  const [igCaption, setIgCaption] = useState("");
  const [igPhotos, setIgPhotos] = useState<string[]>([]);
  const [igLoading, setIgLoading] = useState(false);
  const [igPosting, setIgPosting] = useState(false);
  const [igDone, setIgDone] = useState<{ posted: boolean; note?: string } | null>(null);
  const [igConfigured, setIgConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/publish/instagram/status").then((r) => r.json())
      .then((d) => setIgConfigured(!!d.configured)).catch(() => setIgConfigured(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory?status=available");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleChannel(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    const next = !it[field];
    if (next && !(it.photoCount ?? 0)) { toast.error("Adaugă cel puțin o poză înainte de publicare."); return; }
    const res = await fetch(`/api/inventory/${it._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: next }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    // Păstrăm poza/numărul de poze (ruta de editare nu le întoarce).
    setItems((list) => list.map((x) => (x._id === it._id ? { ...data.item, primaryPhoto: x.primaryPhoto, photoCount: x.photoCount } : x)));
    toast.success(next ? `Publicat pe ${channelName}` : `Retras de pe ${channelName}`);
  }

  function openListing(it: InventoryDTO) {
    setListingTarget(it);
    setLTitle(it.listingTitle ?? `${it.brand} ${it.model} ${it.year}`);
    setLDesc(it.listingDescription ?? "");
  }
  async function saveListing() {
    if (!listingTarget) return;
    setSavingL(true);
    const res = await fetch(`/api/inventory/${listingTarget._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingTitle: lTitle, listingDescription: lDesc }),
    });
    const data = await res.json();
    setSavingL(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === listingTarget._id ? { ...data.item, primaryPhoto: x.primaryPhoto, photoCount: x.photoCount } : x)));
    setListingTarget(null);
    toast.success("Anunț salvat");
  }

  // Pas 1: pregătește (fără a posta) — deschide editorul cu textul generat.
  async function prepareInstagram(it: InventoryDTO) {
    setIgItem(it); setIgLoading(true); setIgDone(null); setIgCaption(""); setIgPhotos([]);
    const res = await fetch(`/api/publish/instagram/${it._id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    const data = await res.json();
    setIgLoading(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); setIgItem(null); return; }
    setIgCaption(data.caption || ""); setIgPhotos(data.photos || []);
  }

  // Pas 2: postează cu textul (posibil editat).
  async function postInstagram() {
    if (!igItem) return;
    setIgPosting(true);
    const res = await fetch(`/api/publish/instagram/${igItem._id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: igCaption, confirm: true }),
    });
    const data = await res.json();
    setIgPosting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    if (data.posted) { toast.success(`Postat pe Instagram${data.photoCount ? ` (${data.photoCount} poze)` : ""}!`); setIgDone({ posted: true }); }
    else { setIgDone({ posted: false, note: data.note }); }
  }

  const onSite = items.filter((i) => i.publishedSite).length;
  const on999 = items.filter((i) => i.published999).length;
  const noPhotos = items.filter((i) => !(i.photoCount ?? 0)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicare</h1>
          <p className="mt-1 text-sm text-slate-500">Alege pe ce canale apare fiecare mașină. Vândută → dispare automat de peste tot.</p>
        </div>
        {igConfigured !== null && (
          <span title={igConfigured ? "Postarea automată pe Instagram este activă" : "Instagram neconfigurat — postarea pregătește doar textul"}>
            <Badge color={igConfigured ? "green" : "gray"}>Instagram: {igConfigured ? "conectat" : "neconectat"}</Badge>
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Disponibile în stoc" value={items.length} />
        <Stat label="Publicate pe site" value={onSite} tone="text-emerald-700" />
        <Stat label="Publicate pe 999.md" value={on999} tone="text-emerald-700" />
        <Stat label="Fără poze (nepublicabile)" value={noPhotos} tone={noPhotos ? "text-amber-600" : undefined} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Foto", "Mașină", "Preț", "Site", "999.md", "Instagram", "Acțiuni"].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Nicio mașină disponibilă în stoc.</td></tr>
              ) : items.map((it) => {
                const hasPhoto = (it.photoCount ?? 0) > 0;
                return (
                  <tr key={it._id} className="transition-colors hover:bg-brand-tint/40">
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
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-900">{formatMoney(it.sellPrice)}</td>
                    <td className="px-3 py-2.5"><PlatformToggle on={!!it.publishedSite} onClick={() => toggleChannel(it, "publishedSite", "Site")} label="Site" color="blue" icon={<IconGlobe />} /></td>
                    <td className="px-3 py-2.5"><PlatformToggle on={!!it.published999} onClick={() => toggleChannel(it, "published999", "999.md")} label="999.md" color="orange" /></td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => prepareInstagram(it)} title="Pregătește / postează pe Instagram"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-105 active:brightness-95">
                        <IconInstagram /> Postează
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setPhotoTarget(it)}>Poze</Button>
                      <Button variant="ghost" size="sm" className="text-brand" onClick={() => openListing(it)}>Anunț</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor anunț (titlu + descriere) */}
      <Modal open={!!listingTarget} onClose={() => setListingTarget(null)} title="Anunț pentru publicare"
        footer={<><Button variant="secondary" onClick={() => setListingTarget(null)} disabled={savingL}>Anulează</Button><Button onClick={saveListing} loading={savingL}>Salvează</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Titlu anunț" value={lTitle} onChange={(e) => setLTitle(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Descriere</label>
            <textarea value={lDesc} onChange={(e) => setLDesc(e.target.value)} rows={5}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Dotări, stare, detalii..." />
          </div>
        </div>
      </Modal>

      {/* Editor + postare Instagram */}
      <Modal open={!!igItem} onClose={() => setIgItem(null)} title="Postează pe Instagram"
        footer={
          igDone?.posted ? (
            <Button variant="secondary" onClick={() => setIgItem(null)}>Închide</Button>
          ) : igDone && !igDone.posted ? (
            <>
              <Button variant="secondary" onClick={() => setIgItem(null)}>Închide</Button>
              <Button onClick={() => { navigator.clipboard.writeText(igCaption); toast.success("Text copiat"); }}>Copiază textul</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setIgItem(null)} disabled={igPosting}>Anulează</Button>
              <Button onClick={postInstagram} loading={igPosting} disabled={igLoading}>Postează</Button>
            </>
          )
        }>
        {igLoading ? (
          <div className="py-8 text-center text-slate-400">Se pregătește...</div>
        ) : igDone?.posted ? (
          <div className="py-6 text-center">
            <Badge color="green">Postat pe Instagram</Badge>
            <p className="mt-3 text-sm text-slate-600">Anunțul a fost publicat cu toate pozele.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {igPhotos.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-slate-500">{igPhotos.length} {igPhotos.length === 1 ? "poză" : "poze"} (se postează toate)</p>
                <div className="grid grid-cols-3 gap-2">
                  {igPhotos.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Text anunț (îl poți edita)</label>
              <textarea value={igCaption} onChange={(e) => setIgCaption(e.target.value)} rows={8}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>
            {igConfigured === false && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">Instagram nu e conectat — la „Postează” primești textul + pozele ca să le pui manual.</p>
            )}
            {igDone && !igDone.posted && igDone.note && <p className="text-xs text-slate-500">{igDone.note}</p>}
          </div>
        )}
      </Modal>

      {photoTarget && (
        <PhotoManager open={!!photoTarget} onClose={() => { setPhotoTarget(null); load(); }} inventoryId={photoTarget._id} label={`${photoTarget.brand} ${photoTarget.model}`} />
      )}
    </div>
  );
}
