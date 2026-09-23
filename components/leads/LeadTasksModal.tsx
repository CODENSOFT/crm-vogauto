"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS, type LeadDTO, type TaskDTO } from "@/types";

/** Sarcinile legate de un client potențial + programarea uneia noi. */
export function LeadTasksModal({
  lead, tasks, title, setTitle, type, setType, date, setDate, saving, onAdd, onClose,
}: {
  lead: LeadDTO | null;
  tasks: TaskDTO[];
  title: string;
  setTitle: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  saving: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
  <Modal open={!!lead} onClose={onClose} title={`Sarcini · ${lead?.clientName ?? ""}`}
    footer={<Button variant="secondary" onClick={onClose}>Închide</Button>}>
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Programează o sarcină</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Titlu" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Vizionare BMW X5" />
          </div>
          <Select label="Tip" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-task-date" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data și ora</label>
            <input id="lead-task-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={onAdd} loading={saving}>Adaugă sarcină</Button>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sarcini existente</p>
        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nicio sarcină pentru acest client.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t._id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="text-xs text-slate-500">{TASK_TYPE_LABELS[t.type]}{t.dueDate ? ` · ${formatDate(t.dueDate)}` : ""}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{TASK_STATUS_LABELS[t.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </Modal>
  );
}
