"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiUserPicker } from "@/components/shared/MultiUserPicker";
import { CarStockPicker } from "@/components/shared/CarStockPicker";
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, type TaskType, type UserDTO } from "@/types";

export interface TaskForm {
  title: string;
  description: string;
  type: TaskType;
  priority: string;
  assignedToIds: string[];
  dueDate: string;
  carLabel: string;
  inventoryId: string;
}

/** Formularul de adăugare/editare a unei sarcini. */
export function TaskFormModal({
  open, editing, form, setForm, saving, isAdmin, workers, onClose, onSave,
}: {
  open: boolean;
  /** true când edităm o sarcină existentă (schimbă doar titlul ferestrei). */
  editing: boolean;
  form: TaskForm;
  setForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  saving: boolean;
  isAdmin: boolean;
  workers: UserDTO[];
  onClose: () => void;
  onSave: () => void;
}) {
  const setF = (k: keyof TaskForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editează sarcina" : "Sarcină nouă"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button><Button onClick={onSave} loading={saving}>Salvează</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Titlu *" value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="ex: Du mașina la ASP pentru vânzare" />
        </div>
        <Select label="Tip" value={form.type} onChange={(e) => setF("type", e.target.value)}>
          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select label="Prioritate" value={form.priority} onChange={(e) => setF("priority", e.target.value)}>
          {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-due" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data și ora</label>
          <input id="task-due" type="datetime-local" value={form.dueDate} onChange={(e) => setF("dueDate", e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
        {isAdmin && (
          <div className="sm:col-span-2">
            <MultiUserPicker label="Responsabili (unul sau mai mulți)" workers={workers}
              value={form.assignedToIds}
              onChange={(ids) => setForm((f) => ({ ...f, assignedToIds: ids }))}
              placeholder="— eu însumi (dacă lași gol) —" />
          </div>
        )}
        <div className="sm:col-span-2">
          <CarStockPicker value={form.carLabel} inventoryId={form.inventoryId}
            onChange={(label, invId) => setForm((f) => ({ ...f, carLabel: label, inventoryId: invId }))} />
        </div>
        <div className="sm:col-span-2">
          <Input label="Detalii" value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Note suplimentare" />
        </div>
      </div>
    </Modal>
  );
}
