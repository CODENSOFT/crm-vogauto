"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/utils";
import type { InventoryDTO } from "@/types";

/**
 * Reducerea unei mașini, pusă din pagina ei.
 *
 * Așa funcționează și la ei pe site: prețul de până acum devine cel tăiat, iar
 * cel nou ia locul lui. De aceea se cere un singur număr — prețul nou — nu
 * două, care s-ar putea încurca între ele.
 */
export function ReducereModal({
  open, item, onClose, onSaved,
}: {
  open: boolean;
  item: InventoryDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pretNou, setPretNou] = useState("");
  const [saving, setSaving] = useState(false);

  const areReducere = !!item.oldPrice && item.oldPrice > item.sellPrice;
  // Când există deja reducere, referința e prețul vechi, nu cel redus.
  const referinta = areReducere ? Number(item.oldPrice) : Number(item.sellPrice);

  useEffect(() => {
    if (open) setPretNou(areReducere ? String(item.sellPrice) : "");
  }, [open, areReducere, item.sellPrice]);

  const nou = Number(pretNou) || 0;
  const reducere = nou > 0 && nou < referinta ? referinta - nou : 0;
  const procent = reducere > 0 ? Math.round((reducere / referinta) * 100) : 0;
  const preaMare = nou > 0 && nou >= referinta;

  async function trimite(body: Record<string, number>) {
    setSaving(true);
    const note = toast.loading("Se actualizează și anunțul de pe site...");
    try {
      const res = await fetch(`/api/inventory/${item._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Eroare.", { id: note }); return; }
      toast.success(d.siteWarning ? "Salvat în CRM" : "Gata — și pe site", { id: note });
      if (d.siteWarning) toast.error(d.siteWarning, { duration: 9000 });
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conexiunea a eșuat.", { id: note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reducere · ${item.brand} ${item.model}`}
      footer={<>
        {areReducere && (
          <Button variant="secondary" disabled={saving}
            onClick={() => trimite({ sellPrice: Number(item.oldPrice), oldPrice: 0 })}
            className="mr-auto">
            Anulează reducerea
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Închide</Button>
        <Button loading={saving} disabled={reducere <= 0}
          onClick={() => trimite({ sellPrice: nou, oldPrice: referinta })}>
          Aplică reducerea
        </Button>
      </>}>
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Preț {areReducere ? "înainte de reducere" : "actual"}:{" "}
          <span className="font-semibold text-slate-900">{formatMoney(referinta)}</span>
          {areReducere && (
            <span className="block text-xs text-slate-500">
              Acum e redus la {formatMoney(item.sellPrice)}.
            </span>
          )}
        </div>

        <Input label="Preț nou, cu reducere (€)" type="number" value={pretNou}
          onChange={(e) => setPretNou(e.target.value)} placeholder={`mai mic decât ${Math.round(referinta)}`} />

        {preaMare && (
          <p className="text-sm font-medium text-red-600">
            Prețul nou trebuie să fie mai mic decât {formatMoney(referinta)}, altfel nu e o reducere.
          </p>
        )}

        {reducere > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Reducere: <span className="font-semibold">{formatMoney(reducere)}</span> ({procent}%)
            <span className="mt-1 block text-xs text-emerald-700">
              Pe site va apărea <span className="line-through">{formatMoney(referinta)}</span>{" "}
              <span className="font-semibold">{formatMoney(nou)}</span> — exact cum arată la celelalte anunțuri.
            </span>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Textul de credit se recalculează pe prețul nou, dacă nu a fost rescris de mână.
        </p>
      </div>
    </Modal>
  );
}
