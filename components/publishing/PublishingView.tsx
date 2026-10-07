"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { SocialPostModal } from "@/components/publishing/SocialPostModal";
import { PublishingHeader } from "@/components/publishing/PublishingHeader";
import { ListingModal } from "@/components/publishing/ListingModal";
import { PublishingTable } from "@/components/publishing/PublishingTable";
import { PhotoManager } from "@/components/photos/PhotoManager";
import { useSocialPost } from "@/components/publishing/useSocialPost";
import { useListingEditor } from "@/components/publishing/useListingEditor";
import { useConnectionStatus } from "@/components/publishing/useConnectionStatus";
import { usePublishToggles } from "@/components/publishing/usePublishToggles";
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
    igLoading, igPosting, igResults, igPoze, prepareSocial, postSocial,
  } = useSocialPost((id, ids) =>
    setItems((list) => list.map((x) => (x._id === id ? { ...x, ...ids } : x))));
  const { igConfigured, igStatus, fbStatus, wpStatus } = useConnectionStatus();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory?status=available");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const { busy, toggleChannel, unpostSocial } = usePublishToggles(
    (id, fields) => setItems((list) => list.map((x) => (x._id === id ? { ...x, ...fields } : x))),
    // Rutele de salvare nu întorc poza și numărul de poze, deci le păstrăm.
    (id, item) => setItems((list) => list.map((x) => (x._id === id
      ? { ...item, primaryPhoto: x.primaryPhoto, photoCount: x.photoCount } : x))),
  );

  const onSite = items.filter((i) => i.publishedSite).length;
  const on999 = items.filter((i) => i.published999).length;
  const noPhotos = items.filter((i) => !(i.photoCount ?? 0)).length;

  return (
    <div>
      <PublishingHeader wpStatus={wpStatus} fbStatus={fbStatus} igConfigured={igConfigured} igStatus={igStatus} />

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
          onUnsocial={unpostSocial}
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
        igPoze={igPoze}
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
