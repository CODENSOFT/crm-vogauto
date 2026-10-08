"use client";

import { useState, useEffect, useCallback } from "react";
import { PhotoGallery } from "@/components/shared/PhotoGallery";
import { Istoric } from "@/components/shared/Istoric";
import { ReducereModal } from "@/components/inventory/ReducereModal";
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [reducereOpen, setReducereOpen] = useState(false);

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
  // Reducerea e reală doar când prețul de dinainte e mai mare decât cel actual.
  const hasReducere = !!item.oldPrice && item.oldPrice > item.sellPrice;
  const procentReducere = hasReducere
    ? Math.round(((item.oldPrice! - item.sellPrice) / item.oldPrice!) * 100)
    : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventory" className="text-sm text-slate-500 hover:text-brand">← Stoc</Link>
          <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-0.02em] text-ink">{item.brand} {item.model} <span className="text-slate-400">{item.year}</span></h1>
          <Badge color={item.status === "available" ? "green" : item.status === "preparing" ? "yellow" : "gray"}>{STOCK_STATUS_LABELS[item.status]}</Badge>
          {item.published && <Badge color="blue">Publicat</Badge>}
          {hasReducere && <Badge color="red">−{procentReducere}% reducere</Badge>}
        </div>
        <div className="flex gap-2">
          {item.status === "preparing" && (
            <Button onClick={markReady} loading={marking}>Mașină gata de vânzare</Button>
          )}
          <Button variant="secondary" onClick={() => setPhotoOpen(true)}>Gestionează poze</Button>
          {/* Foaia de tipar e un document propriu, deci se deschide în tab nou. */}
          <Button variant="secondary" onClick={() => window.open(`/print/inventory/${id}`, "_blank")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 8V4h10v4" />
              <rect x="4" y="8" width="16" height="7" rx="1.5" />
              <path d="M7 15h10v5H7z" />
            </svg>
            Printează fișa
          </Button>
          <Button variant="discount" onClick={() => setReducereOpen(true)}>
            {/* Eticheta de preț spune ce face butonul chiar înainte de a citi. */}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4a1.2 1.2 0 011.2-1.2h8c.5 0 1 .2 1.4.6l7.2 7.2a2 2 0 010 2.8z" />
              <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
            </svg>
            {hasReducere ? "Modifică reducerea" : "Reducere"}
          </Button>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>Editează</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Galerie */}
        <div className="flex flex-col gap-5">
          <PhotoGallery urls={urls} alt={`${item.brand} ${item.model}`} />
          {/* Cheltuielile stau lângă poze și deasupra istoricului: sunt lucruri
              pe care le faci cu mașina, nu date despre ea. Datele stau în
              dreapta, într-un singur loc. */}
          <ExpensesCard inventoryId={id} onChanged={load} />

          {/* Istoricul, ultimul: se citește rar, dar e bine să fie la vedere. */}
          <Istoric timeline={timeline} />
        </div>

        <div className="flex flex-col gap-5">
          <CardPret item={item} />

          <CardDescriere item={item} />
        </div>
      </div>


      {/* Zoom fullscreen */}

      <PhotoManager open={photoOpen} inventoryId={id} label={`${item.brand} ${item.model}`}
        onClose={async () => {
          setPhotoOpen(false);
          // Pozele adăugate aici fac mașina publicabilă. Fără pasul acesta,
          // o mașină fără poze rămânea nepublicată chiar după ce primea poze.
          const note = toast.loading("Se actualizează anunțul de pe site...");
          try {
            const res = await fetch(`/api/publish/site-sync/${id}`, { method: "POST" });
            const d = await res.json().catch(() => ({}));
            if (d.ok) toast.success("Anunțul de pe site e la zi", { id: note });
            else toast.dismiss(note);
          } catch (e) {
            const why = e instanceof Error ? e.message : "cauză necunoscută";
            toast.error(`Pozele s-au salvat, dar site-ul nu s-a actualizat: ${why}`, { id: note, duration: 9000 });
          }
          load();
        }} />

      <InventoryFormModal open={editOpen} editing={item} onClose={() => setEditOpen(false)} onSaved={load} />

      <ReducereModal open={reducereOpen} item={item} onClose={() => setReducereOpen(false)} onSaved={load} />
    </div>
  );
}

/** Prețul și specificațiile mașinii. Scoasă din pagină, care trecuse de 180 de linii. */
function CardPret({ item }: { item: InventoryDTO }) {
  const hasReducere = !!item.oldPrice && item.oldPrice > item.sellPrice;
  const procentReducere = hasReducere
    ? Math.round(((item.oldPrice! - item.sellPrice) / item.oldPrice!) * 100)
    : 0;
  const esteParcarea = item.ownerName?.trim().toLowerCase() === "parcarea";
  const nr = (v?: number | null) => (v ? new Intl.NumberFormat("ro-RO").format(v) : "");

  // Aceleași grupuri ca în formularul de adăugare: cine caută o valoare o
  // găsește în același loc în care a scris-o.
  const grupuri: { titlu: string; nota?: string; randuri: [string, React.ReactNode][] }[] = [
    {
      titlu: "Identificare",
      randuri: [
        ["Marcă", `${item.brand} ${item.model}`],
        ["An", item.year],
        ["VIN", <span key="v" className="font-mono text-xs">{item.vin || "—"}</span>],
        ["Culoare", item.color || "—"],
        ["Status", STOCK_STATUS_LABELS[item.status]],
      ],
    },
    {
      titlu: "Specificații",
      nota: "apar pe anunțul de pe site și în filtrele lui",
      randuri: [
        ["Capacitate motor", item.engine ? `${item.engine} cm³` : "—"],
        ["Putere", item.power ? `${item.power} CP` : "—"],
        ["Parcurs", nr(item.mileage) ? `${nr(item.mileage)} km` : "—"],
        ["Caroserie", item.bodyType || "—"],
        ["Tip combustibil", item.fuelType || "—"],
        ["Transmisie", item.transmission || "—"],
        ["Tip tracțiune", item.driveType || "—"],
        ["Stare", item.condition || "—"],
        ["Uși", item.doors || "—"],
        ["Număr de locuri", item.seats || "—"],
      ],
    },
    {
      titlu: "Proprietar",
      randuri: [
        ["Proprietar", item.ownerName],
        ["Telefon", <span key="t" className="font-mono">{item.ownerPhone && item.ownerPhone !== "—" ? item.ownerPhone : "—"}</span>],
        ["Adăugată de", item.addedByName || "—"],
        ["Data adăugării", formatDateShort(item.createdAt)],
      ],
    },
    {
      titlu: "Bani",
      randuri: [
        [esteParcarea ? "Preț cumpărare" : "Preț cerut de client",
          item.purchaseCost ? formatMoney(item.purchaseCost) : "—"],
        ...(hasReducere
          ? ([["Reducere",
              <span key="r" className="font-semibold text-rose-600">
                −{formatMoney(item.oldPrice! - item.sellPrice)} ({procentReducere}%)
              </span>]] as [string, React.ReactNode][])
          : []),
        ["Cheltuieli", item.expensesTotal
          ? <span key="c" className="text-amber-700">{formatMoney(item.expensesTotal)}</span>
          : "—"],
        [esteParcarea ? "Profit net" : "Adaus net",
          <span key="a" className={(item.netMargin ?? item.markup) >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
            {formatMoney(item.netMargin ?? item.markup)}
          </span>],
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-500">Preț de vânzare</span>
        <span className="flex items-baseline gap-2">
          {/* Reducerea se arată la fel ca pe site: vechiul preț tăiat. */}
          {hasReducere && (
            <span className="text-sm font-medium text-slate-400 line-through">{formatMoney(item.oldPrice)}</span>
          )}
          <span className="text-2xl font-extrabold text-brand">{formatMoney(item.sellPrice)}</span>
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {grupuri.map((g) => (
          <section key={g.titlu}>
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 border-b border-slate-100 pb-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.titlu}</h4>
              {g.nota && <span className="text-[11px] text-slate-400">{g.nota}</span>}
            </div>
            <div className="grid grid-cols-2 gap-x-5">
              {g.randuri.map(([eticheta, valoare]) => (
                <Spec key={eticheta} label={eticheta} value={valoare} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Descrierea anunțului și notele interne.
 *
 * Textul de credit e același la fiecare mașină și are peste 20 de rânduri;
 * desfășurat mereu, împingea tot restul paginii în jos.
 */
function CardDescriere({ item }: { item: InventoryDTO }) {
  const [deschis, setDeschis] = useState(false);

  // Secțiunea e mereu prezentă: dacă textul lipsește, trebuie să se vadă că
  // lipsește, nu să dispară în tăcere.
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="card-label">Descriere anunț</h3>
        <span className="text-xs text-slate-400">textul care apare pe site</span>
      </div>
      {item.listingDescription ? (
        <>
          {/* Textul de credit e același la fiecare mașină și are peste 20
              de rânduri. Desfășurat mereu, împinge tot restul în jos. */}
          <p className={`whitespace-pre-wrap text-sm leading-relaxed text-slate-600 ${
            deschis ? "" : "line-clamp-4"}`}>
            {item.listingDescription}
          </p>
          <button type="button" onClick={() => setDeschis((v) => !v)}
            className="mt-1.5 text-xs font-semibold text-brand hover:underline">
            {deschis ? "Restrânge" : "Arată tot textul"}
          </button>
        </>
      ) : (
        <p className="text-sm text-amber-600">
          Lipsește. Apasă {'„Editează”'} și scrie textul, sau {'„Reface șablonul”'}.
        </p>
      )}
      {item.notes && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Note interne</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.notes}</p>
        </div>
      )}
    </div>
  );
}
