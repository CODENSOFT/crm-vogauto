"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";
import {
  TASK_TYPE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS,
  type TaskDTO, type TaskStatus, type PhotoDTO,
} from "@/types";

const statusColor = (s: TaskStatus) => (s === "done" ? "green" : s === "in_progress" ? "yellow" : "gray");
const priorityColor = (p: string) => (p === "high" ? "red" : p === "low" ? "gray" : "blue");

export function TaskDetailModal({
  task, isAdmin, onClose, onUpdated,
}: {
  task: TaskDTO;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (t: TaskDTO) => void;
}) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [busy, setBusy] = useState(false);

  const carHref = task.inventoryId
    ? `/dashboard/inventory/${task.inventoryId}`
    : task.carId
    ? `/dashboard/cars/${task.carId}`
    : null;

  useEffect(() => {
    const q = task.inventoryId ? `inventoryId=${task.inventoryId}` : task.carId ? `carId=${task.carId}` : null;
    if (!q) { setPhotos([]); return; }
    fetch(`/api/photos?${q}`).then((r) => r.json()).then((d) => {
      if (Array.isArray(d.photos)) { setPhotos(d.photos); setSel(0); }
    }).catch(() => {});
  }, [task.inventoryId, task.carId]);

  async function setStatus(newStatus: TaskStatus) {
    setBusy(true);
    const res = await fetch(`/api/tasks/${task._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(d.error || "Eroare."); return; }
    onUpdated(d.task);
    toast.success(newStatus === "done" ? "Marcat ca realizat" : "Status actualizat");
  }

  const urls = photos.map((p) => p.url);
  const main = urls[sel];

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Detalii sarcină"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            {task.status !== "done" ? (
              <>
                {task.status === "todo" && (
                  <Button variant="secondary" onClick={() => setStatus("in_progress")} loading={busy}>Începe (în lucru)</Button>
                )}
                <Button onClick={() => setStatus("done")} loading={busy}>✓ Marchează realizat</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setStatus("todo")} loading={busy}>Redeschide</Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-lg font-bold text-slate-900 ${task.status === "done" ? "line-through decoration-slate-300" : ""}`}>{task.title}</h3>
              <Badge color={statusColor(task.status)}>{TASK_STATUS_LABELS[task.status]}</Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge color="blue">{TASK_TYPE_LABELS[task.type]}</Badge>
              <Badge color={priorityColor(task.priority)}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {task.dueDate && <div><span className="text-slate-400">Termen: </span><span className="text-slate-800">{formatDate(task.dueDate)}</span></div>}
            {isAdmin && (task.assignedToNames?.length || task.assignedToName) && <div><span className="text-slate-400">Responsabili: </span><span className="text-slate-800">{task.assignedToNames?.length ? task.assignedToNames.join(", ") : task.assignedToName}</span></div>}
          </div>

          {task.description && (
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{task.description}</p>
          )}

          {/* Mașina + fotografii */}
          {(task.carLabel || urls.length > 0) && (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">🚗 {task.carLabel || "Mașină"}</span>
                {carHref && <Link href={carHref} className="text-xs font-medium text-brand hover:underline">Vezi mașina →</Link>}
              </div>
              {urls.length > 0 ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={main} alt="" onClick={() => setZoom(true)} className="h-full w-full cursor-zoom-in object-cover" />
                  </div>
                  {urls.length > 1 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {urls.map((u, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={u} alt="" onClick={() => setSel(i)}
                          className={`h-12 w-16 flex-shrink-0 cursor-pointer rounded object-cover ring-2 ${i === sel ? "ring-brand" : "ring-transparent"}`} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Fără fotografii pentru această mașină.</p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {zoom && main && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt="" className="max-h-[92vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
