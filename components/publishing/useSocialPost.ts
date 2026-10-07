"use client";

// Pregătirea și postarea anunțului pe Facebook și Instagram, scoase din
// pagina de publicare: acolo ajunseseră peste 200 de linii într-o funcție.

import { useState } from "react";
import toast from "react-hot-toast";
import type { PlatformResult } from "@/components/publishing/SocialPostModal";
import type { InventoryDTO } from "@/types";

export function useSocialPost() {
  const [igItem, setIgItem] = useState<InventoryDTO | null>(null);
  const [igCaption, setIgCaption] = useState("");
  const [igPhotos, setIgPhotos] = useState<string[]>([]);
  // Câte din ele acceptă Instagram (formatul lui e mai strict decât al Facebook).
  const [igPoze, setIgPoze] = useState<number | undefined>(undefined);
  const [igLoading, setIgLoading] = useState(false);
  const [igPosting, setIgPosting] = useState(false);
  const [igResults, setIgResults] = useState<PlatformResult[] | null>(null);

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
    setIgCaption(data.caption || ""); setIgPhotos(data.photos || []); setIgPoze(data.igPoze);
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

  return {
    igItem, setIgItem, igCaption, setIgCaption, igPhotos,
    igLoading, igPosting, igResults, igPoze, prepareSocial, postSocial,
  };
}
