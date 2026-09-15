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

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700">{value}</code>
        <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiat"); }}>Copiază</Button>
      </div>
    </div>
  );
}

export function PublishingView() {
  const [items, setItems] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  const [listingTarget, setListingTarget] = useState<InventoryDTO | null>(null);
  const [lTitle, setLTitle] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [savingL, setSavingL] = useState(false);

  const [photoTarget, setPhotoTarget] = useState<InventoryDTO | null>(null);

  const [igOpen, setIgOpen] = useState(false);
  const [igLoading, setIgLoading] = useState(false);
  const [igResult, setIgResult] = useState<{ caption: string; imageUrl?: string; posted: boolean; note?: string } | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory?status=available");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function togglePublished(it: InventoryDTO) {
    const res = await fetch(`/api/inventory/${it._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !it.published }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === it._id ? data.item : x)));
    toast.success(!it.published ? "Publicat" : "Retras de la publicare");
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
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingTitle: lTitle, listingDescription: lDesc }),
    });
    const data = await res.json();
    setSavingL(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === listingTarget._id ? data.item : x)));
    setListingTarget(null);
    toast.success("Anunț salvat");
  }

  async function prepareInstagram(it: InventoryDTO) {
    setIgOpen(true); setIgLoading(true); setIgResult(null);
    const res = await fetch(`/api/publish/instagram/${it._id}`, { method: "POST" });
    const data = await res.json();
    setIgLoading(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); setIgOpen(false); return; }
    setIgResult({ caption: data.caption, imageUrl: data.imageUrl, posted: !!data.posted, note: data.note });
    if (data.posted) toast.success("Postat pe Instagram!");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicare</h1>
        <p className="mt-1 text-sm text-slate-500">Publică mașinile pe site și 999.md prin feed-uri automate, sau pregătește postări Instagram. O vânzare le scoate automat din feed.</p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-slate-700">Feed-uri publice (dă-le site-ului tău și importului 999.md):</p>
        <CopyRow label="Feed site (JSON)" value={`${origin}/api/public/listings`} />
        <CopyRow label="Feed 999.md (XML)" value={`${origin}/api/public/feed-999`} />
        <p className="text-xs text-slate-400">Conțin doar mașinile marcate „Publicat” ȘI disponibile — fără date despre proprietar. Când o mașină e vândută, dispare automat.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Mașină", "An", "Preț", "Publicat", "Acțiuni"].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Nicio mașină disponibilă în stoc.</td></tr>
              ) : items.map((it) => (
                <tr key={it._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{it.brand} {it.model}</td>
                  <td className="px-3 py-2.5 text-slate-600">{it.year}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => togglePublished(it)}>
                      <Badge color={it.published ? "green" : "gray"}>{it.published ? "Publicat" : "Nepublicat"}</Badge>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setPhotoTarget(it)}>Poze</Button>
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openListing(it)}>Anunț</Button>
                    <Button variant="ghost" size="sm" className="text-pink-600" onClick={() => prepareInstagram(it)}>Instagram</Button>
                  </td>
                </tr>
              ))}
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

      {/* Rezultat Instagram */}
      <Modal open={igOpen} onClose={() => setIgOpen(false)} title="Instagram"
        footer={<Button variant="secondary" onClick={() => setIgOpen(false)}>Închide</Button>}>
        {igLoading ? (
          <div className="py-8 text-center text-slate-400">Se pregătește...</div>
        ) : igResult ? (
          <div className="flex flex-col gap-3">
            {igResult.posted
              ? <Badge color="green">Postat automat pe Instagram</Badge>
              : <Badge color="yellow">Pregătit pentru postare manuală</Badge>}
            {igResult.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={igResult.imageUrl} alt="" className="max-h-64 w-full rounded-lg object-cover" />
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Text anunț</label>
              <textarea readOnly value={igResult.caption} rows={7}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800" />
            </div>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(igResult.caption); toast.success("Text copiat"); }}>Copiază textul</Button>
            {igResult.note && <p className="text-xs text-slate-400">{igResult.note}</p>}
          </div>
        ) : null}
      </Modal>

      {photoTarget && (
        <PhotoManager open={!!photoTarget} onClose={() => setPhotoTarget(null)} inventoryId={photoTarget._id} label={`${photoTarget.brand} ${photoTarget.model}`} />
      )}
    </div>
  );
}
