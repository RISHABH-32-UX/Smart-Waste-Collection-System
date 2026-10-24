"use client";
import { useEffect, useState } from "react";
import { RequireRole } from "../../components/RequireRole";
import { api, Role } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
type User = { id: string; email: string; fullName: string; phone?: string; role: Role; active: boolean };
export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]); const [message, setMessage] = useState(""); const [isError, setIsError] = useState(false);
  async function load() { try { setUsers(await api<User[]>("/admin/users")); } catch { setMessage("Unable to load users."); setIsError(true); } }
  useEffect(() => { load(); }, []);
  async function changeRole(id: string, role: Role) {
    try { await api(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }); setMessage(`Role updated to ${role}.`); setIsError(false); load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Role update failed"); setIsError(true); }
  }
  return <RequireRole role="ADMIN">
    <main className="app-shell">
      <div className="page-header">
      <p className="eyebrow">System governance</p>
      <h1 className="page-title">Admin console</h1>
      <p className="page-subtitle">Each account has exactly one role. Public sign-up creates citizen or worker accounts; supervisor and admin access is granted only here.</p>
      </div>
      {message && <p className={`mt-4 ${isError ? "alert-error" : "alert-success"}`}>{message}</p>}
      <section className="card mt-7 overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5 font-semibold">User and role management</div>
        <div className="divide-y divide-slate-200">
          {users.map(user => (
            <div className="grid items-center gap-3 p-4 md:grid-cols-[1fr_190px]" key={user.id}>
              <div>
                <p className="font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={user.active ? "ACTIVE" : "INACTIVE"} />
                <select className="field" value={user.role} onChange={e => changeRole(user.id, e.target.value as Role)} aria-label={`Role for ${user.fullName}`}>
                  <option>CITIZEN</option><option>WORKER</option><option>SUPERVISOR</option><option>ADMIN</option>
                </select>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="m-4 empty-state">No users found.</p>}
        </div>
      </section>
    </main>
  </RequireRole>;
}
