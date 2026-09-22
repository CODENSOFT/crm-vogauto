"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { ExpensesCard } from "@/components/inventory/ExpensesCard";
import { PhotoManager } from "@/components/photos/PhotoManager";
import { InventoryFormModal } from "@/components/inventory/InventoryFormModal";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { STOCK_STATUS_LABELS, type InventoryDTO, type PhotoDTO } from "@/types";
import type { TimelineEvent } from "@/lib/timeline";

function Spec({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={strong ? "text-base font-bold text-slate-900" : "text-sm text-slate-800"}>{value}</span>
    </div>
  );
}

export function InventoryDetail({ id }: { id: string }) {
  const [item, setItem] = useState<InventoryDTO | null>(null);
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ri, rp, rt] = await Promise.all([
      fetch(`/api/inventory/${id}`),
      fetch(`/api/photos?inventoryId=${id}`),
      fetch(`/api/inventory/${id}/timeline`),
    ]);
    const di = await ri.json();
    if (!ri.ok) { setNotFound(true); setLoading(false); return; }
    setItem(di.item);
    const dp = await rp.json();
    if (rp.ok) setPhotos(dp.photos);
    if (rt.ok) { const d = await rt.json(); setTimeline(d.events || []); }
    setSel(0);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Trece mașina din pregătire în stocul de vânzare.
  async function markReady() {
    setMarking(true);
    const res = await fetch(`/api/inventory/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "available" }),
    });
    setMarking(false);
    if (!res.ok) { toast.error("Eroare."); return; }
    toast.success("Mașina a trecut în stoc — se poate vinde");
    load();
  }

  if (loading) return <div className="py-16 text-center text-slate-400">Se încarcă...</div>;
  if (notFound || !item) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">Mașina nu a fost găsită.</p>
        <Link href="/dashboard/inventory" className="mt-3 inline-block text-brand hover:underline">← Înapoi la stoc</Link>
      </div>
    );
  }

  const urls = photos.map((p) => p.url);
  const main = urls[sel];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventory" className="text-sm text-slate-500 hover:text-brand">← Stoc</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{item.brand} {item.model} <span className="text-slate-400">{item.year}</span></h1>
          <Badge color={item.status === "available" ? "green" : item.status === "preparing" ? "yellow" : "gray"}>{STOCK_STATUS_LABELS[item.status]}</Badge>
          {item.published && <Badge color="blue">Publicat</Badge>}
        </div>
        <div className="flex gap-2">
          {item.status === "preparing" && (
            <Button onClick={markReady} loading={marking}>Mașină gata de vânzare</Button>
          )}
          <Button variant="secondary" onClick={() => setPhotoOpen(true)}>Gestionează poze</Button>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>Editează</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Galerie */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main} alt={`${item.brand} ${item.model}`} onClick={() => setZoom(true)}
                className="h-full w-full cursor-zoom-in object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">Fără fotografii</div>
            )}
          </div>
          {urls.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {urls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt="" onClick={() => setSel(i)}
                  className={`h-16 w-20 flex-shrink-0 cursor-pointer rounded-lg object-cover ring-2 ${i === sel ? "ring-brand" : "ring-transparent"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Date + descriere */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-500">Preț de vânzare</span>
              <span className="text-2xl font-extrabold text-brand">{formatMoney(item.sellPrice)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-5">
              <Spec label="An" value={item.year} />
              <Spec label="Culoare" value={item.color || "—"} />
              <Spec label="Motor" value={item.engine || "—"} />
              <Spec label="VIN" value={<span className="font-mono text-xs">{item.vin || "—"}</span>} />
              <Spec label="Status" value={STOCK_STATUS_LABELS[item.status]} />
              <Spec label="Preț cerut client" value={item.clientWantPrice ? formatMoney(item.clientWantPrice) : "—"} />
              <Spec label="Adaus parcare" value={<span className={item.markup >= 0 ? "text-emerald-700" : "text-red-600"}>{formatMoney(item.markup)}</span>} />
              <Spec label="Proprietar" value={item.ownerName} />
              <Spec label="Telefon" value={<span className="font-mono">{item.ownerPhone && item.ownerPhone !== "—" ? item.ownerPhone : "—"}</span>} />
              <Spec label="Adăugată de" value={item.addedByName || "—"} />
              <Spec label="Data adăugării" value={formatDateShort(item.createdAt)} />
            </div>
          </div>

          <ExpensesCard inventoryId={id} />

          {(item.listingDescription || item.notes) && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              {item.listingDescription && (
                <>
                  <h3 className="mb-1 text-sm font-semibold text-slate-700">Descriere</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.listingDescription}</p>
                </>
              )}
              {item.notes && (
                <div className={item.listingDescription ? "mt-3 border-t border-slate-100 pt-3" : ""}>
                  <h3 className="mb-1 text-sm font-semibold text-slate-700">Note interne</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Istoric complet (timeline) */}
      {timeline.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Istoricul mașinii</h3>
          <ol className="relative ml-2 border-l-2 border-slate-100">
            {timeline.map((e, i) => (
              <li key={i} className="mb-4 ml-4 last:mb-0">
                <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-brand ring-4 ring-white" />
                <div className="text-sm font-medium text-slate-800">{e.title}</div>
                {e.detail && <div className="text-xs text-slate-500">{e.detail}</div>}
                {e.date && <div className="text-[11px] text-slate-400">{formatDateShort(e.date)}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Zoom fullscreen */}
      {zoom && main && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt="" className="max-h-[92vh] max-w-full rounded-lg object-contain" />
        </div>
      )}

      <PhotoManager open={photoOpen} onClose={() => { setPhotoOpen(false); load(); }} inventoryId={id} label={`${item.brand} ${item.model}`} />

      <InventoryFormModal open={editOpen} editing={item} onClose={() => setEditOpen(false)} onSaved={load} />
    </div>
  );
}
