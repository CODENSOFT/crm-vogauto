"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { TelegramCard } from "@/components/users/TelegramCard";
import { CarStockPicker } from "@/components/shared/CarStockPicker";
import { MultiUserPicker } from "@/components/shared/MultiUserPicker";
import { IconClock, IconUser, IconCar } from "@/components/ui/Icons";
import { formatDate } from "@/lib/utils";
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  type TaskDTO,
  type TaskType,
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
  assignedToIds: [] as string[], dueDate: "", carLabel: "", inventoryId: "",
};

export function TasksView() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayStr());
  const [allDays, setAllDays] = useState(false);
  const [status, setStatus] = useState("");
  // „active" = tot ce nu e finalizat; „done" = arhiva sarcinilor finalizate.
  const [view, setView] = useState<"active" | "done">("active");
  const [type, setType] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTask, setDetailTask] = useState<TaskDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (view === "done") {
      // Finalizatele se văd toate, indiferent de zi.
      p.set("status", "done");
    } else {
      p.set("hideDone", "1");
      if (!allDays && date) p.set("date", date);
      if (status) p.set("status", status);
    }
    if (type) p.set("type", type);
    if (isAdmin && assignedTo) p.set("assignedTo", assignedTo);
    const res = await fetch(`/api/tasks?${p}`);
    const data = await res.json();
    if (res.ok) setTasks(data.tasks);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [view, allDays, date, status, type, assignedTo, isAdmin]);

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
      assignedToIds: t.assignedToIds ?? (t.assignedTo ? [t.assignedTo] : []), dueDate: toLocalInput(t.dueDate), carLabel: t.carLabel ?? "",
      inventoryId: t.inventoryId ?? "",
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
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Sarcină actualizată" : "Sarcină creată");
    setFormOpen(false); load();
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView("active")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${view === "active" ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              În lucru
            </button>
            <button
              type="button"
              onClick={() => setView("done")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${view === "done" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              Finalizate
            </button>
          </div>
          <Button onClick={openAdd}>Sarcină nouă</Button>
        </div>
      </div>

      {!isAdmin && <TelegramCard worker />}

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {view === "active" && (
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
        )}
        {view === "active" && (
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          <option value="todo">De făcut</option>
          <option value="in_progress">În lucru</option>
        </Select>
        )}
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
          {view === "done" ? "Nicio sarcină finalizată încă." : `Nicio sarcină ${allDays ? "" : "pentru ziua selectată"}.`}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <div
              key={t._id}
              onClick={() => setDetailTask(t)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-card transition-all hover:border-slate-300 hover:shadow-card-hover ${t.status === "done" ? "border-slate-200/60" : "border-slate-200"}`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${t.status === "done" ? "bg-emerald-400" : t.priority === "high" ? "bg-red-500" : t.status === "in_progress" ? "bg-amber-400" : "bg-slate-300"}`} />
              <div className="flex items-start justify-between gap-3 p-4 pl-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`truncate text-[15px] font-semibold ${t.status === "done" ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"}`}>{t.title}</h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{TASK_TYPE_LABELS[t.type]}</span>
                    {t.priority === "high" && <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Urgentă</span>}
                    {t.priority === "low" && <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400">Scăzută</span>}
                  </div>
                  {t.description && <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">{t.description}</p>}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {t.dueDate && <span className="inline-flex items-center gap-1.5"><IconClock className="h-3.5 w-3.5 text-slate-400" />{formatDate(t.dueDate)}</span>}
                    {isAdmin && (t.assignedToNames?.length || t.assignedToName) && <span className="inline-flex items-center gap-1.5"><IconUser className="h-3.5 w-3.5 text-slate-400" />{t.assignedToNames?.length ? t.assignedToNames.join(", ") : t.assignedToName}</span>}
                    {t.carLabel && <span className="inline-flex items-center gap-1.5"><IconCar className="h-3.5 w-3.5 text-slate-400" />{t.carLabel}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2.5" onClick={(e) => e.stopPropagation()}>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.status === "done" ? "bg-emerald-100 text-emerald-700" : t.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {TASK_STATUS_LABELS[t.status]}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(t)} title="Editează" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                      </button>
                      <button onClick={() => setDeleteTarget(t)} title="Șterge" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
                      </button>
                    </div>
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

      <ConfirmDialog open={!!deleteTarget} title="Ștergere sarcină"
        message={`Sigur ștergeți sarcina „${deleteTarget?.title}"?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          isAdmin={isAdmin}
          onClose={() => setDetailTask(null)}
          onUpdated={(u) => {
            // O sarcină finalizată pleacă din lista activă (și invers), ca să
            // se vadă imediat mutarea, fără reîncărcarea paginii.
            const belongs = view === "done" ? u.status === "done" : u.status !== "done";
            setTasks((list) => (belongs ? list.map((x) => (x._id === u._id ? u : x)) : list.filter((x) => x._id !== u._id)));
            setDetailTask(u);
          }}
        />
      )}
    </div>
  );
}
