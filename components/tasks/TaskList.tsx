"use client";

import { IconClock, IconUser, IconCar } from "@/components/ui/Icons";
import { formatDate } from "@/lib/utils";
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS, type TaskDTO } from "@/types";

/** Lista de sarcini, ca un card per sarcină. */
export function TaskList({
  tasks,
  isAdmin,
  onOpen,
  onEdit,
  onDelete,
}: {
  tasks: TaskDTO[];
  isAdmin: boolean;
  onOpen: (task: TaskDTO) => void;
  onEdit: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {tasks.map((t) => (
        <div
          key={t._id}
          role="button"
          tabIndex={0}
          aria-label={`Deschide sarcina: ${t.title}`}
          onClick={() => onOpen(t)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(t); } }}
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
            <div role="presentation" className="flex shrink-0 flex-col items-end gap-2.5" onClick={(e) => e.stopPropagation()}>
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.status === "done" ? "bg-emerald-100 text-emerald-700" : t.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {TASK_STATUS_LABELS[t.status]}
              </span>
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => onEdit(t)} title="Editează" aria-label="Editează sarcina" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </button>
                  <button onClick={() => onDelete(t)} title="Șterge" aria-label="Șterge sarcina" className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
