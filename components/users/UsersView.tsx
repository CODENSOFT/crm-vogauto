"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { type UserDTO } from "@/types";

function CommissionCell({ user, onSaved }: { user: UserDTO; onSaved: () => void }) {
  const [value, setValue] = useState(String(user.commissionPercent ?? 0));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (Number(value) === Number(user.commissionPercent)) return;
    setSaving(true);
    const res = await fetch(`/api/users/${user._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionPercent: value }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); setValue(String(user.commissionPercent ?? 0)); return; }
    toast.success("Comision actualizat"); onSaved();
  }
  return (
    <div className="flex items-center gap-1">
      <input type="number" min={0} max={100} step="0.5" value={value} disabled={saving}
        onChange={(e) => setValue(e.target.value)} onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <span className="text-xs text-slate-400">%</span>
    </div>
  );
}

export function UsersView() {
  const { data: session } = useSession();
  const meId = session?.user?.id;
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleActive(u: UserDTO) {
    const res = await fetch(`/api/users/${u._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success(u.isActive ? "Cont dezactivat" : "Cont activat"); load();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/users/${deleteTarget._id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Utilizator șters"); setDeleteTarget(null); load();
  }

  const columns = [
    { key: "fullName", header: "Nume", render: (u: UserDTO) => <span className="font-medium">{u.fullName}</span> },
    { key: "username", header: "Utilizator", render: (u: UserDTO) => <span className="font-mono text-xs text-slate-600">{u.username}</span> },
    { key: "role", header: "Rol", render: (u: UserDTO) => <Badge color={u.role === "admin" ? "blue" : "gray"}>{u.role === "admin" ? "Administrator" : "Angajat"}</Badge> },
    { key: "isActive", header: "Status", render: (u: UserDTO) => <Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Activ" : "Inactiv"}</Badge> },
    { key: "commissionPercent", header: "Comision (%)", render: (u: UserDTO) => <CommissionCell user={u} onSaved={load} /> },
    { key: "lastLogin", header: "Ultima conectare", render: (u: UserDTO) => formatDate(u.lastLogin ?? null) },
    {
      key: "actions", header: "",
      render: (u: UserDTO) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" className="px-2 py-1 text-xs text-brand" onClick={() => setEditTarget(u)}>Editează</Button>
          {u._id !== meId && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => toggleActive(u)}>{u.isActive ? "Dezactivează" : "Activează"}</Button>}
          {u._id !== meId && <Button variant="ghost" className="px-2 py-1 text-xs text-red-600" onClick={() => setDeleteTarget(u)}>Șterge</Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Utilizatori</h1>
        <Button onClick={() => setAddOpen(true)}>Adaugă angajat</Button>
      </div>

      {loading ? <div className="py-12 text-center text-slate-400">Se încarcă...</div> : <Table columns={columns} data={users} rowKey={(u) => u._id} emptyMessage="Niciun utilizator." />}

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />}
      {editTarget && <EditUserModal user={editTarget} isSelf={editTarget._id === meId} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}

      <ConfirmDialog open={!!deleteTarget} title="Ștergere utilizator" message={`Sigur ștergeți contul ${deleteTarget?.fullName}?`} confirmLabel="Șterge" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, role: "worker" }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Cont creat"); onSaved();
  }
  return (
    <Modal open onClose={onClose} title="Adaugă angajat"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button onClick={save} loading={loading}>Creează</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Nume complet *" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        <Input label="Utilizator (login) *" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="ex: ion.popescu" autoCapitalize="none" spellCheck={false} />
        <Input label="Parolă * (min. 6)" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">Angajatul va putea doar să înregistreze vânzări și să-și vadă propriile totaluri.</p>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, isSelf, onClose, onSaved }: { user: UserDTO; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: user.fullName, username: user.username, role: user.role, commissionPercent: String(user.commissionPercent ?? 0), password: "" });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const payload: Record<string, unknown> = { fullName: form.fullName, username: form.username, commissionPercent: form.commissionPercent };
    if (!isSelf) payload.role = form.role;
    if (form.password) payload.password = form.password;
    const res = await fetch(`/api/users/${user._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); return; }
    toast.success("Utilizator actualizat"); onSaved();
  }
  return (
    <Modal open onClose={onClose} title={`Editează — ${user.fullName}`}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button onClick={save} loading={loading}>Salvează</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Nume complet" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        <Input label="Utilizator (login)" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} autoCapitalize="none" spellCheck={false} />
        <Input label="Parolă nouă (gol = neschimbată)" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
        {!isSelf && (
          <Select label="Rol" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserDTO["role"] }))}>
            <option value="worker">Angajat</option><option value="admin">Administrator</option>
          </Select>
        )}
        <Input label="Comision (%)" type="number" min={0} max={100} step="0.5" value={form.commissionPercent} onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))} />
      </div>
    </Modal>
  );
}
