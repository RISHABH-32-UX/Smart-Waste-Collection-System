"use client";
import { useEffect, useState } from "react";
import { RequireRole } from "../../components/RequireRole";
import { api, getSession, Role } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
import { Users, MapPin, Truck, ShieldCheck, RefreshCw } from "lucide-react";
type User = { id: string; email: string; fullName: string; phone?: string; role: Role; active: boolean };
type Analytics = { totalUsers: number; activeUsers: number; revokedUsers: number; citizens: number; workers: number; supervisors: number; admins: number };
type ActiveTask = { id: string; status: string; priority: string; assignedWorkerName?: string; queuedWorkerName?: string; cancellationReason?: string };
export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const currentUserId = getSession()?.userId;

  async function load() {
    try {
      const [currentUsers, currentAnalytics, currentTasks] = await Promise.all([
        api<User[]>("/admin/users"),
        api<Analytics>("/admin/users/analytics"),
        api<ActiveTask[]>("/admin/tasks"),
      ]);
      setUsers(currentUsers);
      setAnalytics(currentAnalytics);
      setTasks(currentTasks);
    } catch {
      setMessage("Unable to load users and analytics.");
      setIsError(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function cancelTask(task: ActiveTask) {
    const reason = window.prompt(`Cancel task ${task.id.slice(0, 8)}… assigned to ${task.assignedWorkerName ?? "a worker"}? Explain why the request is corrupted or misaligned.`, task.cancellationReason ?? "");
    if (reason === null) return;
    setBusyUserId(task.id);
    try {
      await api(`/admin/tasks/${task.id}`, { method: "DELETE", body: JSON.stringify({ reason: reason.trim() || null }) });
      setMessage(`Task cancelled. Its complaints return to the verified queue for re-dispatch.`);
      setIsError(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to cancel this task.");
      setIsError(true);
    } finally {
      setBusyUserId(null);
    }
  }

  async function changeRole(id: string, role: Role) {
    setBusyUserId(id);
    try {
      await api(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      setMessage(`Role updated to ${role}.`);
      setIsError(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Role update failed");
      setIsError(true);
    } finally {
      setBusyUserId(null);
    }
  }

  async function setAccess(user: User) {
    setBusyUserId(user.id);
    try {
      await api(`/admin/users/${user.id}/active`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
      setMessage(user.active ? `${user.fullName}'s access has been revoked.` : `${user.fullName}'s access has been restored.`);
      setIsError(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to update account access.");
      setIsError(true);
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Delete ${user.fullName}'s account? Their access will be removed and personal data anonymized, while operational records are preserved.`)) return;
    setBusyUserId(user.id);
    try {
      await api(`/admin/users/${user.id}`, { method: "DELETE" });
      setMessage(`${user.fullName}'s account was deleted and anonymized.`);
      setIsError(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to delete this account.");
      setIsError(true);
    } finally {
      setBusyUserId(null);
    }
  }

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <RequireRole role="ADMIN">
      <main className="app-shell space-y-8">
        <div className="page-header flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">System governance</p>
            <h1 className="page-title">Admin Console</h1>
            <p className="page-subtitle">Each account has exactly one role. Public sign-up creates citizen or worker accounts; supervisor and admin access is granted only here.</p>
          </div>
          <button onClick={load} className="btn-secondary self-start md:self-auto text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {message && (
          <div className={isError ? "alert-error" : "alert-success"}>
            <p className="font-semibold">{isError ? "System Alert" : "Success"}</p>
            <p className="mt-0.5 text-xs">{message}</p>
          </div>
        )}

        {analytics && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Accounts</span>
                <span className="rounded-md bg-slate-100 p-1.5 text-slate-700">
                  <Users className="w-4 h-4 text-slate-700" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{analytics.totalUsers}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-600/20">{analytics.activeUsers} active</span>
                <span className="badge bg-slate-100 text-slate-600 ring-slate-500/20">{analytics.revokedUsers} revoked</span>
              </div>
            </article>

            <article className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Citizens</span>
                <span className="rounded-md bg-emerald-50 p-1.5 text-brand-700">
                  <MapPin className="w-4 h-4 text-brand-700" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-brand-700">{analytics.citizens}</p>
              <p className="mt-3 text-xs text-slate-500">Registered community reporters</p>
            </article>

            <article className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Field Workers</span>
                <span className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                  <Truck className="w-4 h-4 text-blue-700" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-blue-700">{analytics.workers}</p>
              <p className="mt-3 text-xs text-slate-500">Active municipal field workforce</p>
            </article>

            <article className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Municipal Managers</span>
                <span className="rounded-md bg-violet-50 p-1.5 text-violet-700">
                  <ShieldCheck className="w-4 h-4 text-violet-700" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-violet-700">{analytics.supervisors + analytics.admins}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>{analytics.supervisors} supervisors</span>
                <span>·</span>
                <span>{analytics.admins} admins</span>
              </div>
            </article>
          </section>
        )}

        {/* User and Role Management Table */}
        <section className="card overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">User and Role Management</h2>
              <p className="mt-0.5 text-xs text-slate-500">Revoke blocks access immediately. Delete anonymizes personal data while preserving audit history.</p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search user by name, email, or role…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="field text-xs min-h-9"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <div className="grid items-center gap-3 p-4 transition hover:bg-slate-50/60 md:grid-cols-[1fr_200px_auto]" key={user.id}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {user.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{user.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <StatusBadge value={user.active ? "ACTIVE" : "INACTIVE"} />
                  <select
                    className="field text-xs min-h-9 py-1"
                    value={user.role}
                    disabled={busyUserId === user.id || user.id === currentUserId}
                    onChange={e => changeRole(user.id, e.target.value as Role)}
                    aria-label={`Role for ${user.fullName}`}
                  >
                    <option>CITIZEN</option>
                    <option>WORKER</option>
                    <option>SUPERVISOR</option>
                    <option>ADMIN</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className={`btn-sm ${user.active ? "btn-secondary text-slate-700" : "btn-primary"}`}
                    disabled={busyUserId === user.id || user.id === currentUserId}
                    onClick={() => setAccess(user)}
                  >
                    {busyUserId === user.id ? "Updating…" : user.active ? "Revoke" : "Restore"}
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    disabled={busyUserId === user.id || user.id === currentUserId}
                    onClick={() => deleteUser(user)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                {users.length === 0 ? "No users found in database." : "No users matched your search criteria."}
              </div>
            )}
          </div>
        </section>

        {/* Task Governance Section */}
        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Task Governance</h2>
              <p className="mt-0.5 text-xs text-slate-500">Cancel a corrupted or misaligned request. Its complaints return to the verified queue for re-dispatch.</p>
            </div>
            <span className="badge bg-red-50 text-red-800 ring-red-600/20 font-bold">
              {tasks.length} in flight
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.map(task => (
              <div className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between" key={task.id}>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={task.priority} />
                    <StatusBadge value={task.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Task <span className="font-mono font-bold text-slate-900">{task.id.slice(0, 8)}</span> · Assigned: <span className="font-semibold text-slate-900">{task.assignedWorkerName ?? task.queuedWorkerName ?? "Unassigned"}</span>
                  </p>
                  {task.cancellationReason && (
                    <p className="mt-1 text-xs font-medium text-red-700">
                      Cancelled reason: {task.cancellationReason}
                    </p>
                  )}
                </div>
                <button
                  className="btn-danger btn-sm shrink-0 self-start sm:self-auto"
                  disabled={busyUserId === task.id}
                  onClick={() => cancelTask(task)}
                >
                  {busyUserId === task.id ? "Cancelling…" : "Cancel Request"}
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No tasks are currently in flight.
              </div>
            )}
          </div>
        </section>
      </main>
    </RequireRole>
  );
}
