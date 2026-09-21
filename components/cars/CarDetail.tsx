"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { IconEye } from "@/components/ui/Icons";
import { PhotoManager } from "@/components/photos/PhotoManager";
import { CarEditModal } from "@/components/cars/CarEditModal";
import { formatMoney, formatDateShort } from "@/lib/utils";
import { STATUS_LABELS, PAYMENT_LABELS, type CarDTO, type PhotoDTO } from "@/types";
import type { CarPnl } from "@/lib/pnl";
import type { TimelineEvent } from "@/lib/timeline";

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

export function CarDetail({ id }: { id: string }) {
  const [car, setCar] = useState<CarDTO | null>(null);
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [pnl, setPnl] = useState<CarPnl | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rp, rpnl, rt] = await Promise.all([
      fetch(`/api/cars/${id}`),
      fetch(`/api/photos?carId=${id}`),
      fetch(`/api/cars/${id}/pnl`),
      fetch(`/api/cars/${id}/timeline`),
    ]);
    const dc = await rc.json();
    if (!rc.ok) { setNotFound(true); setLoading(false); return; }
    setCar(dc.car);
    const dp = await rp.json();
    if (rp.ok) setPhotos(dp.photos);
    if (rpnl.ok) { const d = await rpnl.json(); setPnl(d.pnl); }
    if (rt.ok) { const d = await rt.json(); setTimeline(d.events || []); }
    setSel(0);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function revealPhone() {
    const res = await fetch(`/api/cars/${id}/reveal-phone`, { method: "POST" });
    const d = await res.json();
    if (res.ok) setPhone(d.phone);
  }

  if (loading) return <div className="py-16 text-center text-slate-400">Se încarcă...</div>;
  if (notFound || !car) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">Vânzarea nu a fost găsită.</p>
        <Link href="/dashboard/cars" className="mt-3 inline-block text-brand hover:underline">← Înapoi la vânzări</Link>
      </div>
    );
  }

  const urls = photos.map((p) => p.url);
  const main = urls[sel];
  const profit = Number(car.priceSell) - Number(car.priceBuy);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/cars" className="text-sm text-slate-500 hover:text-brand">← Vânzări</Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{car.brand} {car.model} <span className="text-slate-400">{car.year}</span></h1>
          <Badge color={car.status === "sold" ? "gray" : car.status === "available" ? "green" : "yellow"}>{STATUS_LABELS[car.status]}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPhotoOpen(true)}>Gestionează poze</Button>
          <Button onClick={() => setEditOpen(true)}>Editează</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main} alt={`${car.brand} ${car.model}`} onClick={() => setZoom(true)} className="h-full w-full cursor-zoom-in object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">Fără fotografii</div>
            )}
          </div>
          {urls.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {urls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt="" onClick={() => setSel(i)} className={`h-16 w-20 flex-shrink-0 cursor-pointer rounded-lg object-cover ring-2 ${i === sel ? "ring-brand" : "ring-transparent"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-500">Preț de vânzare</span>
              <span className="text-2xl font-extrabold text-brand">{formatMoney(car.priceSell)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-5">
              <Spec label="An" value={car.year} />
              <Spec label="Culoare" value={car.color || "—"} />
              <Spec label="VIN" value={<span className="font-mono text-xs">{car.vin}</span>} />
              <Spec label="Preț cumpărare" value={formatMoney(car.priceBuy)} />
              <Spec label="Profit" value={<span className={profit >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{formatMoney(profit)}</span>} />
              <Spec label="Plată" value={PAYMENT_LABELS[car.paymentMethod]} />
              <Spec label="Client" value={car.clientName} />
              <Spec label="Telefon" value={
                phone ? <span className="font-mono">{phone}</span> : (
                  <button onClick={revealPhone} className="inline-flex items-center gap-1 font-mono text-slate-600 hover:text-brand" title="Arată numărul (se înregistrează)">
                    {car.clientPhone} <IconEye className="h-3.5 w-3.5" />
                  </button>
                )
              } />
              <Spec label="Vândut de" value={car.soldByName || "—"} />
              <Spec label="Data vânzării" value={formatDateShort(car.saleDate)} />
            </div>
          </div>

          {/* Profit net real (P&L) */}
          {pnl && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Profit net real</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Preț vânzare</span><span className="font-medium text-slate-800">{formatMoney(pnl.priceSell)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">− Preț cumpărare</span><span className="text-slate-700">{formatMoney(pnl.priceBuy)}</span></div>
                {pnl.commission > 0 && <div className="flex justify-between"><span className="text-slate-500">− Comision vânzător</span><span className="text-slate-700">{formatMoney(pnl.commission)}</span></div>}
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                  <span className="text-slate-700">Profit net</span>
                  <span className={pnl.net >= 0 ? "text-emerald-700" : "text-red-600"}>{formatMoney(pnl.net)}</span>
                </div>
              </div>
            </div>
          )}

          {car.notes && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <h3 className="mb-1 text-sm font-semibold text-slate-700">Note</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{car.notes}</p>
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

      {zoom && main && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt="" className="max-h-[92vh] max-w-full rounded-lg object-contain" />
        </div>
      )}

      <PhotoManager open={photoOpen} onClose={() => { setPhotoOpen(false); load(); }} carId={id} label={`${car.brand} ${car.model}`} />

      <CarEditModal open={editOpen} car={car} onClose={() => setEditOpen(false)} onSaved={load} />
    </div>
  );
}
