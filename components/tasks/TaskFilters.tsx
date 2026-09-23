"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { TASK_TYPE_LABELS, type UserDTO } from "@/types";

/** Bara de filtre din pagina Sarcini (zi, status, tip, lucrător). */
export function TaskFilters({
  isAdmin, view, date, setDate, allDays, setAllDays,
  status, setStatus, type, setType, assignedTo, setAssignedTo, workers,
}: {
  isAdmin: boolean;
  view: "active" | "done";
  date: string;
  setDate: (v: string) => void;
  allDays: boolean;
  setAllDays: React.Dispatch<React.SetStateAction<boolean>>;
  status: string;
  setStatus: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  assignedTo: string;
  setAssignedTo: (v: string) => void;
  workers: UserDTO[];
}) {
  return (
  <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
    {view === "active" && (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="task-day" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ziua</label>
      <div className="flex gap-2">
        <input
          id="task-day" type="date" value={date} disabled={allDays}
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
  );
}
