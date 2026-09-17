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

  const [igConfigured, setIgConfigured] = useState<boolean | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    fetch("/api/publish/instagram/status").then((r) => r.json())
      .then((d) => setIgConfigured(!!d.configured)).catch(() => setIgConfigured(false));
  }, []);

  const embedCode =
    `<div id="vogauto-listings"></div>\n` +
    `<script src="${origin}/embed/vogauto.js" async data-phone="+373XXXXXXXX"></script>`;

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
    const res = await fetch(`/api/inventory/${it._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === it._id ? data.item : x)));
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicare</h1>
          <p className="mt-1 text-sm text-slate-500">Publică mașinile pe site și 999.md prin feed-uri automate, sau pregătește postări Instagram. O vânzare le scoate automat din feed.</p>
        </div>
        {igConfigured !== null && (
          <span title={igConfigured ? "Postarea automată este activă" : "Adaugă IG_ACCESS_TOKEN și IG_USER_ID ca să activezi postarea automată"}>
            <Badge color={igConfigured ? "green" : "gray"}>
              Instagram: {igConfigured ? "conectat" : "neconectat"}
            </Badge>
          </span>
        )}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-slate-700">Feed-uri publice (dă-le site-ului tău și importului 999.md):</p>
        <CopyRow label="Feed site (JSON)" value={`${origin}/api/public/listings`} />
        <CopyRow label="Feed 999.md (XML)" value={`${origin}/api/public/feed-999`} />
        <p className="text-xs text-slate-400">Fiecare feed conține doar mașinile publicate pe canalul respectiv (butoanele „Site” / „999.md” din tabel) ȘI disponibile — fără date despre proprietar. Vândută → dispare automat din feed.</p>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-slate-700">Widget pentru site (WordPress)</p>
        <p className="mt-1 text-xs text-slate-500">
          În pagina dorită din WordPress → adaugă un bloc <strong>„HTML personalizat”</strong> → lipește codul de mai jos.
          Pune numărul vostru la <code>data-phone</code>. Mașinile marcate „Publicat” cu poze apar automat; vândute → dispar automat.
        </p>
        <div className="mt-2 flex items-start gap-2">
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-slate-900 px-3 py-2.5 text-xs leading-relaxed text-slate-100">{embedCode}</pre>
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(embedCode); toast.success("Cod copiat"); }}>Copiază</Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Opțional pe <code>&lt;script&gt;</code>: <code>data-columns=&quot;3&quot;</code> pentru număr fix de coloane.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Mașină", "An", "Preț", "Site", "999.md", "Instagram", "Acțiuni"].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Nicio mașină disponibilă în stoc.</td></tr>
              ) : items.map((it) => (
                <tr key={it._id} className="transition-colors hover:bg-brand-tint/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{it.brand} {it.model}</td>
                  <td className="px-3 py-2.5 text-slate-600">{it.year}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">{formatMoney(it.sellPrice)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleChannel(it, "publishedSite", "site")}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${it.publishedSite ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {it.publishedSite ? "● Publicat" : "○ Publică"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleChannel(it, "published999", "999.md")}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${it.published999 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {it.published999 ? "● Publicat" : "○ Publică"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button variant="ghost" size="sm" className="text-pink-600" onClick={() => prepareInstagram(it)}>Postează</Button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setPhotoTarget(it)}>Poze</Button>
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => openListing(it)}>Anunț</Button>
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
