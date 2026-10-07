"use client";

// Comutatoarele de publicare (site, 999.md, rețele sociale), scoase din pagină:
// toate trei au aceeași grijă — o apăsare publică, a doua retrage, iar între
// ele trebuie să nu plece două cereri în paralel.

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import type { InventoryDTO } from "@/types";

type Patch = (id: string, fields: Partial<InventoryDTO>) => void;
type Replace = (id: string, item: InventoryDTO) => void;

export function usePublishToggles(patch: Patch, replace: Replace) {
  // Publicarea pe site durează (se urcă pozele). Fără zăvor, apăsările
  // repetate porneau cereri în paralel, fiecare creând alt anunț.
  // Zăvorul stă într-un ref, nu în state: starea din React se actualizează
  // asincron, așa că două apăsări la o secundă distanță vedeau amândouă
  // „liber" și porneau două cereri — exact aşa au apărut anunțuri duble.
  const inFlight = useRef<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  /** Pornește o operație, dacă aceeași nu e deja pe drum. */
  async function cuZavor(key: string, treaba: () => Promise<void>) {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setBusy(key);
    try {
      await treaba();
    } finally {
      inFlight.current.delete(key);
      setBusy(null);
    }
  }

  function toggleChannel(it: InventoryDTO, field: "publishedSite" | "published999", channelName: string) {
    return cuZavor(`${it._id}:${field}`, () => comutaCanal(it, field, channelName, replace));
  }

  function unpostSocial(it: InventoryDTO) {
    if (!window.confirm(`Scoți postarea pentru „${it.brand} ${it.model}"?\n\nPostarea de pe Facebook se șterge.${it.igPostId ? " Cea de pe Instagram trebuie ștearsă de mână din aplicație — îți dăm adresa ei." : ""}`)) {
      return Promise.resolve();
    }
    return cuZavor(`${it._id}:social`, () => scoateDeLaSocial(it, patch));
  }

  return { busy, toggleChannel, unpostSocial };
}

async function comutaCanal(
  it: InventoryDTO,
  field: "publishedSite" | "published999",
  channelName: string,
  replace: Replace,
) {
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
    replace(it._id, data.item);
    toast.success(next ? `Publicat pe ${channelName}` : `Retras de pe ${channelName}`, { id: note });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Conexiunea a eșuat.", { id: note });
  }
}

/**
 * Scoate postarea de pe rețele. Facebook se șterge prin API; Instagram nu are
 * așa ceva, deci dăm adresa postării ca s-o șteargă din aplicație — altfel
 * omul crede că s-a retras și de acolo.
 */
async function scoateDeLaSocial(it: InventoryDTO, patch: Patch) {
  const note = toast.loading("Se scoate postarea...");
  try {
    const res = await fetch(`/api/publish/social/${it._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare.", { id: note }); return; }

    patch(it._id, { fbPostId: null, igPostId: null, igPermalink: null });

    if (data.eroareFb) toast.error(`Facebook: ${data.eroareFb}`, { id: note, duration: 8000 });
    else if (data.instagramPermalink) {
      toast.success("Postarea de pe Facebook a fost ștearsă.", { id: note });
      toast(`Instagram nu permite ștergerea din CRM. Șterge-o din aplicație: ${data.instagramPermalink}`,
        { duration: 12000, icon: "⚠️" });
    } else toast.success("Postarea a fost scoasă.", { id: note });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Conexiunea a eșuat.", { id: note });
  }
}
