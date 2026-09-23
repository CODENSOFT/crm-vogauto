"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/Modal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskHeader } from "@/components/tasks/TaskHeader";
import { TaskList } from "@/components/tasks/TaskList";
import { TelegramCard } from "@/components/users/TelegramCard";
import {
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
      <TaskHeader isAdmin={isAdmin} view={view} setView={setView} onAdd={openAdd} />

      {!isAdmin && <TelegramCard worker />}

      <TaskFilters
        isAdmin={isAdmin}
        view={view}
        date={date}
        setDate={setDate}
        allDays={allDays}
        setAllDays={setAllDays}
        status={status}
        setStatus={setStatus}
        type={type}
        setType={setType}
        assignedTo={assignedTo}
        setAssignedTo={setAssignedTo}
        workers={workers}
      />

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
          {view === "done" ? "Nicio sarcină finalizată încă." : `Nicio sarcină ${allDays ? "" : "pentru ziua selectată"}.`}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          isAdmin={isAdmin}
          onOpen={setDetailTask}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <TaskFormModal
        open={formOpen}
        editing={!!editing}
        form={form}
        setForm={setForm}
        saving={saving}
        isAdmin={isAdmin}
        workers={workers}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />

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
