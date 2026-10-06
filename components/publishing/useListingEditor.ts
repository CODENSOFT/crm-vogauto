"use client";

// Editorul de anunț (titlu și descriere), scos din pagina de publicare, ca
// aceasta să rămână despre ce se vede, nu despre cum se salvează.

import { useState } from "react";
import toast from "react-hot-toast";
import { buildDescriptionTemplate } from "@/lib/listingTemplate";
import type { InventoryDTO } from "@/types";

export function useListingEditor(onItemSaved: (item: InventoryDTO) => void) {
  const [listingTarget, setListingTarget] = useState<InventoryDTO | null>(null);
  const [lTitle, setLTitle] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [savingL, setSavingL] = useState(false);

  function openListing(it: InventoryDTO) {
    setListingTarget(it);
    setLTitle(it.listingTitle ?? `${it.brand} ${it.model} ${it.year}`);
    // Textul de credit apare deja scris, calculat pe prețul acestei mașini.
    // Butonul „Șablon credit" rămâne doar pentru a-l reface după o editare.
    setLDesc(it.listingDescription?.trim() || buildDescriptionTemplate(Number(it.sellPrice)));
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
    onItemSaved(data.item);
    setListingTarget(null);
    toast.success("Anunț salvat");
  }

  return { listingTarget, setListingTarget, lTitle, setLTitle, lDesc, setLDesc, savingL, openListing, saveListing };
}
