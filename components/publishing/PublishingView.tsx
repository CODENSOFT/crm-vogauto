"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { SocialPostModal } from "@/components/publishing/SocialPostModal";
import { PublishingHeader } from "@/components/publishing/PublishingHeader";
import { ListingModal } from "@/components/publishing/ListingModal";
import { PublishingTable } from "@/components/publishing/PublishingTable";
import { PhotoManager } from "@/components/photos/PhotoManager";
import { useSocialPost } from "@/components/publishing/useSocialPost";
import { useListingEditor } from "@/components/publishing/useListingEditor";
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

  const {
    listingTarget, setListingTarget, lTitle, setLTitle, lDesc, setLDesc,
    savingL, openListing, saveListing,
  } = useListingEditor((item) =>
    setItems((list) => list.map((x) => (x._id === item._id
      ? { ...item, primaryPhoto: x.primaryPhoto, photoCount: x.photoCount } : x))));

  const [photoTarget, setPhotoTarget] = useState<InventoryDTO | null>(null);

  const {
    igItem, setIgItem, igCaption, setIgCaption, igPhotos,
    igLoading, igPosting, igResults, prepareSocial, postSocial,
  } = useSocialPost();
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
  // Zăvorul stă într-un ref, nu în state: starea din React se actualizează
  // asincron, așa că două apăsări la o secundă distanță vedeau amândouă
  // „liber" și porneau două cereri — exact aşa au apărut anunțuri duble.
  const inFlight = useRef<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleChannel(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    const key = `${it._id}:${field}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setBusy(key);
    try {
      await doToggle(it, field, channelName);
    } finally {
      inFlight.current.delete(key);
      setBusy(null);
    }
  }

  async function doToggle(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    // Pentru site, starea reală e „există anunț acolo", nu doar bifa: o bifă
    // rămasă din trecut făcea ca apăsarea să retragă în loc să publice.
    const isSite = field === "publishedSite";
    const current = isSite ? !!(it.publishedSite && it.wpPostId) : !!it[field];
    const next = !current;

    // Retragerea ascunde anunțul de pe site. E ușor de apăsat din greșeală
    // imediat după publicare, așa că întrebăm întâi.
    if (!next && !window.confirm(`Retragi „${it.brand} ${it.model}" de pe ${channelName}?\n\nAnunțul devine ciornă și nu mai e vizibil pe site. Îl poți publica din nou oricând.`)) {
      return;
    }
    if (next && !(it.photoCount ?? 0)) { toast.error("Adaugă cel puțin o poză înainte de publicare."); return; }

    // Publicarea pe site urcă pozele una după alta, deci durează. Ținem un
    // mesaj deschis tot timpul, ca să se vadă că lucrează și la ce anume.
    const slow = isSite && next;
    const note = slow
      ? toast.loading(`Se publică „${it.brand} ${it.model}" pe site — se urcă ${it.photoCount ?? 0} ${(it.photoCount ?? 0) === 1 ? "poză" : "poze"}...`)
      : undefined;

    try {
      // Site-ul înseamnă un articol real în WordPress, deci are ruta lui;
      // 999.md citește feedul, deci acolo e suficient comutatorul.
      const res = isSite
        ? await fetch(`/api/publish/wordpress/${it._id}`, { method: next ? "POST" : "DELETE" })
        : await fetch(`/api/inventory/${it._id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: next }),
          });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Eroare.", { id: note }); return; }
      // Păstrăm poza/numărul de poze (rutele de salvare nu le întorc).
      setItems((list) => list.map((x) => (x._id === it._id ? { ...data.item, primaryPhoto: x.primaryPhoto, photoCount: x.photoCount } : x)));
      toast.success(next ? `Publicat pe ${channelName}` : `Retras de pe ${channelName}`, { id: note });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conexiunea a eșuat.", { id: note });
    }
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
        <PhotoManager open={!!photoTarget} inventoryId={photoTarget._id}
          label={`${photoTarget.brand} ${photoTarget.model}`}
          onClose={async () => {
            const id = photoTarget._id;
            setPhotoTarget(null);
            // Pozele s-au schimbat: aducem anunțul de pe site la zi, o dată.
            await fetch(`/api/publish/site-sync/${id}`, { method: "POST" }).catch(() => {});
            load();
          }} />
      )}
    </div>
  );
}
