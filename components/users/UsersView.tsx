"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { type UserDTO } from "@/types";
import { TelegramCard } from "@/components/users/TelegramCard";

// Celulă numerică editabilă pentru un câmp al utilizatorului (taxă sau bonus).
function NumCell({ user, field, onSaved }: { user: UserDTO; field: "fixedFee" | "bonus"; onSaved: () => void }) {
  const current = field === "fixedFee" ? (user.fixedFee ?? 50) : (user.bonus ?? 0);
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (Number(value) === Number(current)) return;
    setSaving(true);
    const res = await fetch(`/api/users/${user._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error || "Eroare."); setValue(String(current)); return; }
    toast.success(field === "fixedFee" ? "Taxă actualizată" : "Bonus actualizat"); onSaved();
  }
  return (
    <div className="flex items-center gap-1">
      <input type="number" min={0} step="1" value={value} disabled={saving}
        onChange={(e) => setValue(e.target.value)} onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <span className="text-xs text-slate-400">€</span>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone ?? "text-slate-900"}`}>{value}</p>
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

  const admins = users.filter((u) => u.role === "admin").length;
  const active = users.filter((u) => u.isActive).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Utilizatori</h1>
          <p className="mt-1 text-sm text-slate-500">Conturi, roluri și comisioane (taxă + bonus per angajat).</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Adaugă angajat</Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total conturi" value={users.length} />
        <StatCard label="Administratori" value={admins} tone="text-brand" />
        <StatCard label="Active" value={active} tone="text-emerald-700" />
        <StatCard label="Inactive" value={users.length - active} tone={users.length - active ? "text-red-600" : undefined} />
      </div>

      <TelegramCard />

      {loading ? (
        <div className="py-12 text-center text-slate-400">Se încarcă...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {["Utilizator", "Rol", "Status", "Taxă / vânzare", "Bonus", "Ultima conectare", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Niciun utilizator.</td></tr>
              ) : users.map((u) => (
                <tr key={u._id} className="transition-colors hover:bg-brand-tint/40">
                  <th scope="row" aria-label={u.fullName} className="whitespace-nowrap px-3 py-2.5 text-left font-normal">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white ring-1 ring-white/20">{initials(u.fullName)}</span>
                      <div className="leading-tight">
                        <div className="font-medium text-slate-800">{u.fullName}{u._id === meId && <span className="ml-1.5 text-[10px] font-semibold text-brand">(tu)</span>}</div>
                        <div className="font-mono text-[11px] text-slate-400">{u.username}</div>
                      </div>
                    </div>
                  </th>
                  <td className="px-3 py-2.5"><Badge color={u.role === "admin" ? "blue" : "gray"}>{u.role === "admin" ? "Administrator" : "Angajat"}</Badge></td>
                  <td className="px-3 py-2.5"><Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Activ" : "Inactiv"}</Badge></td>
                  <td className="px-3 py-2.5"><NumCell user={u} field="fixedFee" onSaved={load} /></td>
                  <td className="px-3 py-2.5"><NumCell user={u} field="bonus" onSaved={load} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{u.lastLogin ? formatDate(u.lastLogin) : <span className="text-slate-400">niciodată</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-brand" onClick={() => setEditTarget(u)}>Editează</Button>
                    {u._id !== meId && <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => toggleActive(u)}>{u.isActive ? "Dezactivează" : "Activează"}</Button>}
                    {u._id !== meId && <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(u)}>Șterge</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />}
      {editTarget && <EditUserModal user={editTarget} isSelf={editTarget._id === meId} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}

      <ConfirmDialog open={!!deleteTarget} title="Ștergere utilizator" message={`Sigur ștergeți contul ${deleteTarget?.fullName}?`} confirmLabel="Șterge" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: "", username: "", password: "", fixedFee: "50", bonus: "0" });
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
        <div className="grid grid-cols-2 gap-3">
          <Input label="Taxă fixă / vânzare (€)" type="number" min={0} value={form.fixedFee} onChange={(e) => setForm((f) => ({ ...f, fixedFee: e.target.value }))} />
          <Input label="Bonus (€)" type="number" min={0} value={form.bonus} onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))} />
        </div>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">Angajatul va putea doar să înregistreze vânzări și să-și vadă propriile totaluri. Plata = taxă × vânzări + bonus.</p>
      </div>
    </Modal>
  );
}

function EditUserModal({ user, isSelf, onClose, onSaved }: { user: UserDTO; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: user.fullName, username: user.username, role: user.role, fixedFee: String(user.fixedFee ?? 50), bonus: String(user.bonus ?? 0), password: "" });
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const payload: Record<string, unknown> = { fullName: form.fullName, username: form.username, fixedFee: form.fixedFee, bonus: form.bonus };
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
        <div className="grid grid-cols-2 gap-3">
          <Input label="Taxă fixă / vânzare (€)" type="number" min={0} value={form.fixedFee} onChange={(e) => setForm((f) => ({ ...f, fixedFee: e.target.value }))} />
          <Input label="Bonus (€)" type="number" min={0} value={form.bonus} onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
