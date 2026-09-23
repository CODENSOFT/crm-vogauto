"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS, type LeadDTO, type TaskDTO } from "@/types";

/** Sarcinile legate de un client potențial + programarea uneia noi. */
export function LeadTasksModal({ lead, onClose }: { lead: LeadDTO | null; onClose: () => void }) {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("test_drive");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  // La deschidere: titlu sugerat din interesul clientului + sarcinile existente.
  useEffect(() => {
    if (!lead) return;
    setTasks([]);
    setTitle(lead.interestBrand || lead.interestModel
      ? `Vizionare ${[lead.interestBrand, lead.interestModel].filter(Boolean).join(" ")}`
      : `Vizionare client ${lead.clientName}`);
    setType("test_drive");
    setDate("");
    fetch(`/api/tasks?leadId=${lead._id}`)
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d) => setTasks(d.tasks || []))
      .catch(() => {});
  }, [lead]);

  async function onAdd() {
    if (!lead || !title.trim()) { toast.error("Introduceți titlul."); return; }
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(), type, dueDate: date || undefined,
        leadId: lead._id, inventoryId: lead.inventoryId || undefined,
        carLabel: [lead.interestBrand, lead.interestModel].filter(Boolean).join(" ") || undefined,
        assignedToIds: lead.assignedToIds ?? (lead.assignedTo ? [lead.assignedTo] : []),
        description: `Client: ${lead.clientName}${lead.clientPhone ? ` · ${lead.clientPhone}` : ""}`,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(d.error || "Eroare."); return; }
    toast.success("Sarcină programată");
    setTasks((list) => [d.task, ...list]);
    setTitle(""); setDate("");
  }

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
