"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  type TaskDTO,
  type TaskType,
  type TaskStatus,
  type UserDTO,
} from "@/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EMPTY = {
  title: "", description: "", type: "general" as TaskType, priority: "normal",
  assignedTo: "", dueDate: "", carLabel: "",
};

const statusColor = (s: TaskStatus) => (s === "done" ? "green" : s === "in_progress" ? "yellow" : "gray");
const priorityColor = (p: string) => (p === "high" ? "red" : p === "low" ? "gray" : "blue");

export function TasksView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayStr());
  const [allDays, setAllDays] = useState(false);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (!allDays && date) p.set("date", date);
    if (status) p.set("status", status);
    if (type) p.set("type", type);
    if (isAdmin && assignedTo) p.set("assignedTo", assignedTo);
    const res = await fetch(`/api/tasks?${p}`);
    const data = await res.json();
    if (res.ok) setTasks(data.tasks);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [allDays, date, status, type, assignedTo, isAdmin]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  // Adminul are nevoie de lista de angajați pentru atribuire/filtrare.
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.users)) setWorkers(d.users.filter((u: UserDTO) => u.isActive));
    }).catch(() => {});
  }, [isAdmin]);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, dueDate: allDays ? "" : `${date}T09:00` });
    setFormOpen(true);
  }
  function openEdit(t: TaskDTO) {
    setEditing(t);
    setForm({
      title: t.title, description: t.description ?? "", type: t.type, priority: t.priority,
      assignedTo: t.assignedTo ?? "", dueDate: toLocalInput(t.dueDate), carLabel: t.carLabel ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.title.trim()) { toast.error("Introduceți titlul sarcinii."); return; }
    setSaving(true);
    const url = editing ? `/api/tasks/${editing._id}` : "/api/tasks";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, assignedTo: form.assignedTo || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Sarcină actualizată" : "Sarcină creată");
    setFormOpen(false); load();
  }

  async function changeStatus(t: TaskDTO, newStatus: TaskStatus) {
    const res = await fetch(`/api/tasks/${t._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setTasks((list) => list.map((x) => (x._id === t._id ? data.task : x)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Sarcină ștearsă"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "Sarcini" : "Sarcinile mele"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Atribuie sarcini lucrătorilor și urmărește programul zilnic."
              : "Sarcinile tale pe zi. Marchează progresul pe măsură ce le finalizezi."}
          </p>
        </div>
        <Button onClick={openAdd}>Sarcină nouă</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ziua</label>
          <div className="flex gap-2">
            <input
              type="date" value={date} disabled={allDays}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
            />
            <Button variant={allDays ? "primary" : "secondary"} size="sm" onClick={() => setAllDays((v) => !v)}>
              Toate
            </Button>
          </div>
        </div>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          <option value="todo">De făcut</option>
          <option value="in_progress">În lucru</option>
          <option value="done">Finalizate</option>
        </Select>
        <Select label="Tip" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        {isAdmin && (
          <Select label="Lucrător" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Toți</option>
            {workers.map((w) => <option key={w._id} value={w._id}>{w.fullName}</option>)}
          </Select>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          Nicio sarcină {allDays ? "" : "pentru ziua selectată"}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <div key={t._id} className={`rounded-xl border bg-white p-4 shadow-card transition-colors ${t.status === "done" ? "border-slate-200/60 opacity-70" : "border-slate-200/80"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-semibold text-slate-900 ${t.status === "done" ? "line-through decoration-slate-300" : ""}`}>{t.title}</span>
                    <Badge color="blue">{TASK_TYPE_LABELS[t.type]}</Badge>
                    <Badge color={priorityColor(t.priority)}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                  </div>
                  {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {t.dueDate && <span>🕑 {formatDate(t.dueDate)}</span>}
                    {isAdmin && t.assignedToName && <span>👤 {t.assignedToName}</span>}
                    {t.carLabel && <span>🚗 {t.carLabel}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge color={statusColor(t.status)}>{TASK_STATUS_LABELS[t.status]}</Badge>
                  <Select
                    aria-label="Schimbă status"
                    value={t.status}
                    onChange={(e) => changeStatus(t, e.target.value as TaskStatus)}
                    className="!py-1.5 text-xs"
                  >
                    <option value="todo">De făcut</option>
                    <option value="in_progress">În lucru</option>
                    <option value="done">Finalizat</option>
                  </Select>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="sm" className="text-brand" onClick={() => openEdit(t)}>Editează</Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(t)}>Șterge</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editează sarcina" : "Sarcină nouă"}
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Anulează</Button><Button onClick={save} loading={saving}>Salvează</Button></>}>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Data și ora</label>
            <input type="datetime-local" value={form.dueDate} onChange={(e) => setF("dueDate", e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          {isAdmin && (
            <Select label="Atribuie lucrătorului" value={form.assignedTo} onChange={(e) => setF("assignedTo", e.target.value)}>
              <option value="">— eu însumi —</option>
              {workers.map((w) => <option key={w._id} value={w._id}>{w.fullName}</option>)}
            </Select>
          )}
          <div className="sm:col-span-2">
            <Input label="Mașină (opțional)" value={form.carLabel} onChange={(e) => setF("carLabel", e.target.value)} placeholder="ex: BMW X5 2018" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Detalii" value={form.description} onChange={(e) => setF("description", e.target.value)} placeholder="Note suplimentare" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Ștergere sarcină"
        message={`Sigur ștergeți sarcina „${deleteTarget?.title}"?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
