"use client";
import { useEffect, useState } from "react";
import { RequireRole } from "../../components/RequireRole";
import { api, getSession, Role } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
type User = { id: string; email: string; fullName: string; phone?: string; role: Role; active: boolean };
type Analytics = { totalUsers: number; activeUsers: number; revokedUsers: number; citizens: number; workers: number; supervisors: number; admins: number };
type ActiveTask = { id: string; status: string; priority: string; assignedWorkerName?: string; queuedWorkerName?: string; cancellationReason?: string };
export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]); const [analytics, setAnalytics] = useState<Analytics | null>(null); const [message, setMessage] = useState(""); const [isError, setIsError] = useState(false); const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const currentUserId = getSession()?.userId;
  async function load() { try { const [currentUsers, currentAnalytics, currentTasks] = await Promise.all([api<User[]>("/admin/users"), api<Analytics>("/admin/users/analytics"), api<ActiveTask[]>("/admin/tasks")]); setUsers(currentUsers); setAnalytics(currentAnalytics); setTasks(currentTasks); } catch { setMessage("Unable to load users and analytics."); setIsError(true); } }
  useEffect(() => { load(); }, []);
  async function cancelTask(task: ActiveTask) {
    const reason = window.prompt(`Cancel task ${task.id.slice(0, 8)}… assigned to ${task.assignedWorkerName ?? "a worker"}? Explain why the request is corrupted or misaligned.`, task.cancellationReason ?? "");
    if (reason === null) return;
    setBusyUserId(task.id);
    try { await api(`/admin/tasks/${task.id}`, { method: "DELETE", body: JSON.stringify({ reason: reason.trim() || null }) }); setMessage(`Task cancelled. Its complaints return to the verified queue for re-dispatch.`); setIsError(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to cancel this task."); setIsError(true); }
    finally { setBusyUserId(null); }
  }
  async function changeRole(id: string, role: Role) {
    setBusyUserId(id);
    try { await api(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }); setMessage(`Role updated to ${role}.`); setIsError(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Role update failed"); setIsError(true); }
    finally { setBusyUserId(null); }
  }
  async function setAccess(user: User) {
    setBusyUserId(user.id);
    try { await api(`/admin/users/${user.id}/active`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) }); setMessage(user.active ? `${user.fullName}'s access has been revoked.` : `${user.fullName}'s access has been restored.`); setIsError(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to update account access."); setIsError(true); }
    finally { setBusyUserId(null); }
  }
  async function deleteUser(user: User) {
    if (!window.confirm(`Delete ${user.fullName}'s account? Their access will be removed and personal data anonymized, while operational records are preserved.`)) return;
    setBusyUserId(user.id);
    try { await api(`/admin/users/${user.id}`, { method: "DELETE" }); setMessage(`${user.fullName}'s account was deleted and anonymized.`); setIsError(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to delete this account."); setIsError(true); }
    finally { setBusyUserId(null); }
  }
  return <RequireRole role="ADMIN">
    <main className="app-shell">
      <div className="page-header">
      <p className="eyebrow">System governance</p>
      <h1 className="page-title">Admin console</h1>
      <p className="page-subtitle">Each account has exactly one role. Public sign-up creates citizen or worker accounts; supervisor and admin access is granted only here.</p>
      </div>
      {message && <p className={`mt-4 ${isError ? "alert-error" : "alert-success"}`}>{message}</p>}
      {analytics && <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card-compact"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current users</p><p className="mt-2 text-2xl font-bold text-slate-950">{analytics.totalUsers}</p><p className="mt-1 text-xs text-slate-500">{analytics.activeUsers} active · {analytics.revokedUsers} revoked</p></article>
        <article className="card-compact"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Citizens</p><p className="mt-2 text-2xl font-bold text-emerald-800">{analytics.citizens}</p></article>
        <article className="card-compact"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Workers</p><p className="mt-2 text-2xl font-bold text-blue-800">{analytics.workers}</p></article>
        <article className="card-compact"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Municipal managers</p><p className="mt-2 text-2xl font-bold text-violet-800">{analytics.supervisors + analytics.admins}</p><p className="mt-1 text-xs text-slate-500">{analytics.supervisors} supervisors · {analytics.admins} admins</p></article>
      </section>}
      <section className="card mt-7 overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5"><p className="font-semibold">User and role management</p><p className="mt-1 text-sm text-slate-500">Revoke blocks access immediately. Delete removes the account from the current-user list and anonymizes personal data while preserving audit history.</p></div>
        <div className="divide-y divide-slate-200">
          {users.map(user => (
            <div className="grid items-center gap-3 p-4 md:grid-cols-[1fr_190px_auto]" key={user.id}>
              <div>
                <p className="font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={user.active ? "ACTIVE" : "INACTIVE"} />
                <select className="field" value={user.role} disabled={busyUserId === user.id || user.id === currentUserId} onChange={e => changeRole(user.id, e.target.value as Role)} aria-label={`Role for ${user.fullName}`}>
                  <option>CITIZEN</option><option>WORKER</option><option>SUPERVISOR</option><option>ADMIN</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2"><button className={user.active ? "btn-secondary" : "btn-primary"} disabled={busyUserId === user.id || user.id === currentUserId} onClick={() => setAccess(user)}>{user.active ? "Revoke" : "Restore"}</button><button className="btn-danger" disabled={busyUserId === user.id || user.id === currentUserId} onClick={() => deleteUser(user)}>Delete</button></div>
            </div>
          ))}
          {users.length === 0 && <p className="m-4 empty-state">No users found.</p>}
        </div>
      </section>
      <section className="card mt-7 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5"><div><p className="font-semibold">Task governance</p><p className="mt-1 text-sm text-slate-500">Cancel a corrupted or misaligned request. Its complaints return to the verified queue for re-dispatch to another worker.</p></div><span className="badge bg-red-50 text-red-800 ring-red-600/20">{tasks.length} in flight</span></div>
        <div className="divide-y divide-slate-200">
          {tasks.map(task => (
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={task.id}>
              <div>
                <div className="flex flex-wrap gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div>
                <p className="mt-2 text-sm text-slate-700">Task <span className="font-mono text-slate-900">{task.id.slice(0, 8)}</span> · {task.assignedWorkerName ?? task.queuedWorkerName ?? "Unassigned"}</p>
                {task.cancellationReason && <p className="mt-1 text-xs text-red-700">Cancelled: {task.cancellationReason}</p>}
              </div>
              <button className="btn-danger shrink-0" disabled={busyUserId === task.id} onClick={() => cancelTask(task)}>{busyUserId === task.id ? "Cancelling…" : "Cancel request"}</button>
            </div>
          ))}
          {tasks.length === 0 && <p className="m-4 empty-state">No tasks are currently in flight.</p>}
        </div>
      </section>
    </main>
  </RequireRole>;
}
