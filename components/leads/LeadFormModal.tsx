"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CarStockPicker } from "@/components/shared/CarStockPicker";
import { MultiUserPicker } from "@/components/shared/MultiUserPicker";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadSource, type UserDTO } from "@/types";

export interface LeadForm {
  clientName: string;
  clientPhone: string;
  source: LeadSource;
  interestBrand: string;
  interestModel: string;
  budget: string;
  inventoryId: string;
  carLabel: string;
  status: string;
  assignedToIds: string[];
  notes: string;
}

/** Formularul de adăugare/editare a unui client potențial. */
export function LeadFormModal({
  open, editing, form, setForm, saving, workers, onClose, onSave,
}: {
  open: boolean;
  editing: boolean;
  form: LeadForm;
  setForm: React.Dispatch<React.SetStateAction<LeadForm>>;
  saving: boolean;
  workers: UserDTO[];
  onClose: () => void;
  onSave: () => void;
}) {
  const setF = (k: keyof LeadForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
  <Modal open={open} onClose={onClose} title={editing ? "Editează client potențial" : "Client potențial nou"}
    footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={onSave} loading={saving}>Salvează</Button></>}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Input label="Nume client *" value={form.clientName} onChange={(e) => setF("clientName", e.target.value)} />
      <Input label="Telefon" value={form.clientPhone} onChange={(e) => setF("clientPhone", e.target.value)} />
      <Select label="Sursă" value={form.source} onChange={(e) => setF("source", e.target.value)}>
        {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Select label="Status" value={form.status} onChange={(e) => setF("status", e.target.value)}>
        {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Input label="Marcă dorită" value={form.interestBrand} onChange={(e) => setF("interestBrand", e.target.value)} />
      <Input label="Model dorit" value={form.interestModel} onChange={(e) => setF("interestModel", e.target.value)} />
      <Input label="Buget (€)" type="number" value={form.budget} onChange={(e) => setF("budget", e.target.value)} />
      <MultiUserPicker label="Responsabili" workers={workers}
        value={form.assignedToIds} onChange={(ids) => setForm((f) => ({ ...f, assignedToIds: ids }))} />
      <div className="sm:col-span-2">
        <CarStockPicker value={form.carLabel} inventoryId={form.inventoryId}
          onChange={(label, invId) => setForm((f) => ({ ...f, carLabel: label, inventoryId: invId }))} label="Mașina de interes (din stoc, opțional)" />
      </div>
      <div className="sm:col-span-2">
        <Input label="Note" value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Detalii discuție, preferințe..." />
      </div>
    </div>
  </Modal>
  );
}
