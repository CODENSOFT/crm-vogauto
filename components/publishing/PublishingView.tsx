"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { InstagramModal } from "@/components/publishing/InstagramModal";
import { PublishingTable } from "@/components/publishing/PublishingTable";
import { PhotoManager } from "@/components/photos/PhotoManager";
import type { InventoryDTO } from "@/types";

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

// Buton de publicare în stilul platformei (Site = albastru, 999.md = portocaliu).
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
        <PublishingTable
          items={items}
          onToggle={toggleChannel}
          onListing={openListing}
          onPhotos={setPhotoTarget}
          onInstagram={prepareInstagram}
        />
      )}

      {/* Editor anunț (titlu + descriere) */}
      <Modal open={!!listingTarget} onClose={() => setListingTarget(null)} title="Anunț pentru publicare"
        footer={<><Button variant="secondary" onClick={() => setListingTarget(null)} disabled={savingL}>Anulează</Button><Button onClick={saveListing} loading={savingL}>Salvează</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Titlu anunț" value={lTitle} onChange={(e) => setLTitle(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="listing-desc" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Descriere</label>
            <textarea id="listing-desc" value={lDesc} onChange={(e) => setLDesc(e.target.value)} rows={5}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Dotări, stare, detalii..." />
          </div>
        </div>
      </Modal>

      {/* Editor + postare Instagram */}
      <InstagramModal
        item={igItem}
        caption={igCaption}
        setCaption={setIgCaption}
        photos={igPhotos}
        loading={igLoading}
        posting={igPosting}
        done={igDone}
        configured={igConfigured}
        onPost={postInstagram}
        onClose={() => setIgItem(null)}
      />

      {photoTarget && (
        <PhotoManager open={!!photoTarget} onClose={() => { setPhotoTarget(null); load(); }} inventoryId={photoTarget._id} label={`${photoTarget.brand} ${photoTarget.model}`} />
      )}
    </div>
  );
}
