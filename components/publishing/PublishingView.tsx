"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { SocialPostModal, type PlatformResult } from "@/components/publishing/SocialPostModal";
import { PublishingHeader } from "@/components/publishing/PublishingHeader";
import { ListingModal } from "@/components/publishing/ListingModal";
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
  const [igResults, setIgResults] = useState<PlatformResult[] | null>(null);
  const [igConfigured, setIgConfigured] = useState<boolean | null>(null);
  const [fbStatus, setFbStatus] = useState<{ ok: boolean; page?: string; error?: string } | null>(null);
  const [wpStatus, setWpStatus] = useState<{ ok: boolean; user?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/publish/instagram/status").then((r) => r.json())
      .then((d) => setIgConfigured(!!d.configured)).catch(() => setIgConfigured(false));
    fetch("/api/publish/facebook/status")
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then(setFbStatus)
      .catch(() => setFbStatus({ ok: false }));
    fetch("/api/publish/wordpress/status")
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then(setWpStatus)
      .catch(() => setWpStatus({ ok: false }));
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

  // Publicarea pe site durează (se urcă pozele). Fără zăvor, apăsările
  // repetate porneau cereri în paralel, fiecare creând alt anunț.
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleChannel(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    const key = `${it._id}:${field}`;
    if (busy === key) return;
    setBusy(key);
    try {
      await doToggle(it, field, channelName);
    } finally {
      setBusy(null);
    }
  }

  async function doToggle(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    // Pentru site, starea reală e „există anunț acolo", nu doar bifa: o bifă
    // rămasă din trecut făcea ca apăsarea să retragă în loc să publice.
    const isSite = field === "publishedSite";
    const current = isSite ? !!(it.publishedSite && it.wpPostId) : !!it[field];
    const next = !current;
    if (next && !(it.photoCount ?? 0)) { toast.error("Adaugă cel puțin o poză înainte de publicare."); return; }

    // Site-ul înseamnă un articol real în WordPress, deci are ruta lui;
    // 999.md citește feedul, deci acolo e suficient comutatorul.
    const res = isSite
      ? await fetch(`/api/publish/wordpress/${it._id}`, { method: next ? "POST" : "DELETE" })
      : await fetch(`/api/inventory/${it._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: next }),
        });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    // Păstrăm poza/numărul de poze (rutele de salvare nu le întorc).
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
  // O singură fereastră și o singură apăsare pentru ambele rețele.
  async function prepareSocial(it: InventoryDTO) {
    setIgItem(it); setIgLoading(true); setIgResults(null); setIgCaption(""); setIgPhotos([]);
    const res = await fetch(`/api/publish/social/${it._id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    const data = await res.json();
    setIgLoading(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); setIgItem(null); return; }
    setIgCaption(data.caption || ""); setIgPhotos(data.photos || []);
  }

  // Pas 2: postează cu textul (posibil editat).
  async function postSocial() {
    if (!igItem) return;
    setIgPosting(true);
    const res = await fetch(`/api/publish/social/${igItem._id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: igCaption, confirm: true }),
    });
    const data = await res.json();
    setIgPosting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    const list: PlatformResult[] = data.results ?? [];
    setIgResults(list);
    const ok = list.filter((r) => r.posted).map((r) => (r.platform === "facebook" ? "Facebook" : "Instagram"));
    if (ok.length) toast.success(`Postat pe ${ok.join(" și ")}${data.photoCount ? ` (${data.photoCount} poze)` : ""}!`);
    else toast.error("Nu s-a putut posta pe nicio rețea.");
  }

  const onSite = items.filter((i) => i.publishedSite).length;
  const on999 = items.filter((i) => i.published999).length;
  const noPhotos = items.filter((i) => !(i.photoCount ?? 0)).length;

  return (
    <div>
      <PublishingHeader wpStatus={wpStatus} fbStatus={fbStatus} igConfigured={igConfigured} />

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
          busy={busy}
          onToggle={toggleChannel}
          onListing={openListing}
          onPhotos={setPhotoTarget}
          onSocial={prepareSocial}
        />
      )}

      {/* Editor anunț (titlu + descriere) */}
      <ListingModal
        target={listingTarget}
        title={lTitle}
        setTitle={setLTitle}
        desc={lDesc}
        setDesc={setLDesc}
        saving={savingL}
        onClose={() => setListingTarget(null)}
        onSave={saveListing}
      />

      {/* Editor + postare Instagram */}
      <SocialPostModal
        item={igItem}
        caption={igCaption}
        setCaption={setIgCaption}
        photos={igPhotos}
        loading={igLoading}
        posting={igPosting}
        results={igResults}
        fbReady={fbStatus?.ok ?? null}
        igReady={igConfigured}
        onPost={postSocial}
        onClose={() => setIgItem(null)}
      />

      {photoTarget && (
        <PhotoManager open={!!photoTarget} onClose={() => { setPhotoTarget(null); load(); }} inventoryId={photoTarget._id} label={`${photoTarget.brand} ${photoTarget.model}`} />
      )}
    </div>
  );
}
