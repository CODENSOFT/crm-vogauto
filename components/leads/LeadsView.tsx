"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { LeadCards } from "@/components/leads/LeadCards";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadTasksModal } from "@/components/leads/LeadTasksModal";
import {
  LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS,
  type LeadDTO, type LeadSource, type LeadStatus, type UserDTO, type TaskDTO,
} from "@/types";

const EMPTY = {
  clientName: "", clientPhone: "", source: "call" as LeadSource, interestBrand: "", interestModel: "",
  budget: "", inventoryId: "", carLabel: "", status: "new", assignedToIds: [] as string[], notes: "",
};


export function LeadsView() {
  const [items, setItems] = useState<LeadDTO[]>([]);
  const [workers, setWorkers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadDTO | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sarcinile clientului (modal legat de lead).
  const [tasksLead, setTasksLead] = useState<LeadDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    const res = await fetch(`/api/leads?${p}`);
    const data = await res.json();
    if (res.ok) setItems(data.leads);
    else toast.error(data.error || "Eroare.");
    setLoading(false);
  }, [status]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/users").then((r) => (r.ok ? r.json() : { users: [] })).then((d) => {
      if (Array.isArray(d.users)) setWorkers(d.users.filter((u: UserDTO) => u.isActive));
    }).catch(() => {});
  }, []);

  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openAdd() { setEditing(null); setForm({ ...EMPTY }); setFormOpen(true); }
  function openEdit(l: LeadDTO) {
    setEditing(l);
    setForm({
      clientName: l.clientName, clientPhone: l.clientPhone ?? "", source: l.source,
      interestBrand: l.interestBrand ?? "", interestModel: l.interestModel ?? "",
      budget: String(l.budget ?? ""), inventoryId: l.inventoryId ?? "", carLabel: "",
      status: l.status, assignedToIds: l.assignedToIds ?? (l.assignedTo ? [l.assignedTo] : []), notes: l.notes ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.clientName.trim()) { toast.error("Introduceți numele clientului."); return; }
    setSaving(true);
    const url = editing ? `/api/leads/${editing._id}` : "/api/leads";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(editing ? "Client potențial actualizat" : "Client potențial adăugat");
    setFormOpen(false); load();
  }

  async function changeStatus(l: LeadDTO, newStatus: LeadStatus) {
    const res = await fetch(`/api/leads/${l._id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    setItems((list) => list.map((x) => (x._id === l._id ? data.lead : x)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Client potențial șters"); setDeleteTarget(null); load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clienți potențiali</h1>
          <p className="mt-1 text-sm text-slate-500">Cine a sunat, ce mașină vrea și în ce etapă e — de la primul contact până la vânzare.</p>
        </div>
        <Button onClick={openAdd}>Client potențial nou</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card sm:grid-cols-3">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Toate</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <>
        <LeadCards
          items={items}
          onStatus={changeStatus}
          onTasks={setTasksLead}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />

        <LeadsTable items={items} onStatus={changeStatus} onTasks={setTasksLead} onEdit={openEdit} onDelete={setDeleteTarget} />
        </>
      )}

      <LeadFormModal
        open={formOpen}
        editing={!!editing}
        form={form}
        setForm={setForm}
        saving={saving}
        workers={workers}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />

      <ConfirmDialog open={!!deleteTarget} title="Ștergere client potențial"
        message={`Sigur ștergeți clientul potențial „${deleteTarget?.clientName}"?`}
        confirmLabel="Șterge" loading={deleting} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      {/* Sarcinile clientului (vizionări, follow-up) */}
      <LeadTasksModal lead={tasksLead} onClose={() => setTasksLead(null)} />
    </div>
  );
}
