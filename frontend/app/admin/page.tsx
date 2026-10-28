"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireRole } from "../../components/RequireRole";
import { api, getSession, Role } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
import {
  ShieldAlert,
  Users,
  HardHat,
  ShieldCheck,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Sparkles,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  active: boolean;
};

type Analytics = {
  totalUsers: number;
  activeUsers: number;
  revokedUsers: number;
  citizens: number;
  workers: number;
  supervisors: number;
  admins: number;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const currentUserId = getSession()?.userId;

  async function load() {
    try {
      const [currentUsers, currentAnalytics] = await Promise.all([
        api<User[]>("/admin/users"),
        api<Analytics>("/admin/users/analytics"),
      ]);
      setUsers(currentUsers);
      setAnalytics(currentAnalytics);
    } catch {
      setMessage("Unable to load user registry and analytics.");
      setIsError(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(id: string, role: Role) {
    setBusyUserId(id);
    try {
      await api(`/admin/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      setMessage(`User role successfully updated to ${role}.`);
      setIsError(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Role update failed.");
      setIsError(true);
    } finally {
      setBusyUserId(null);
    }
  }

  async function setAccess(user: User) {
    setBusyUserId(user.id);
    try {
      await api(`/admin/users/${user.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      });
      setMessage(
        user.active
          ? `${user.fullName}'s account access has been revoked.`
          : `${user.fullName}'s account access has been restored.`
      );
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
    if (
      !window.confirm(
        `Delete ${user.fullName}'s account? Their access will be removed and personal data anonymized, while operational task logs are preserved.`
      )
    ) {
      return;
    }
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

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery));
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <RequireRole role="ADMIN">
      <main className="app-shell max-w-6xl space-y-8">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                <span>System Governance</span>
              </p>
              <h1 className="page-title">Administrator Console</h1>
              <p className="page-subtitle">
                Manage single-role accounts, promote users to municipal roles, configure security revocations, and supervise system activity.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Full Governance Authorization</span>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium transition-all animate-fade-in ${
              isError
                ? "border border-red-200 bg-red-50 text-red-900 shadow-xs"
                : "border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs"
            }`}
          >
            {isError ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            )}
            <div className="flex-1 leading-5">{message}</div>
          </div>
        )}

        {/* Analytics Statistics Cards */}
        {analytics && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Users */}
            <article className="card-compact border-slate-200/90 shadow-card bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Users</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{analytics.totalUsers}</p>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-semibold text-emerald-700">{analytics.activeUsers} active</span> ·{" "}
                <span className="font-semibold text-amber-700">{analytics.revokedUsers} revoked</span>
              </p>
            </article>

            {/* Citizens */}
            <article className="card-compact border-slate-200/90 shadow-card bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Citizens</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-emerald-800">{analytics.citizens}</p>
              <p className="mt-1 text-xs text-slate-500">Public civic reporters</p>
            </article>

            {/* Workers */}
            <article className="card-compact border-slate-200/90 shadow-card bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Workers</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <HardHat className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-blue-800">{analytics.workers}</p>
              <p className="mt-1 text-xs text-slate-500">Municipal sanitation staff</p>
            </article>

            {/* Municipal Managers */}
            <article className="card-compact border-slate-200/90 shadow-card bg-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Managers</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-purple-800">
                {analytics.supervisors + analytics.admins}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {analytics.supervisors} supervisors · {analytics.admins} admins
              </p>
            </article>
          </section>
        )}

        {/* User Registry and Role Management */}
        <section className="card p-0 overflow-hidden border-slate-200/90 shadow-card">
          {/* Header & Filter Controls */}
          <div className="border-b border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">User & Role Management</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Revoke blocks login immediately. Delete anonymizes personal data while preserving audit trails.
                </p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                {filteredUsers.length} of {users.length} Users
              </span>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="field pl-9 py-2 text-xs"
                  placeholder="Search by full name, email, or phone number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                {["ALL", "CITIZEN", "WORKER", "SUPERVISOR", "ADMIN"].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      roleFilter === r
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => setRoleFilter(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User List Rows */}
          <div className="divide-y divide-slate-100 bg-white">
            {filteredUsers.map(user => {
              const isSelf = user.id === currentUserId;
              const isBusy = busyUserId === user.id;

              // Extract initials for avatar
              const initials = user.fullName
                .split(" ")
                .map(n => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  className="grid items-center gap-4 p-4 sm:p-5 hover:bg-slate-50/50 transition lg:grid-cols-[1fr_210px_auto]"
                  key={user.id}
                >
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-sm font-bold text-white shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 truncate">{user.fullName}</p>
                        {isSelf && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        {user.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{user.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Single Role Selector */}
                  <div className="flex items-center gap-3">
                    <StatusBadge value={user.active ? "ACTIVE" : "INACTIVE"} />
                    <select
                      className="field py-1.5 text-xs font-semibold bg-white"
                      value={user.role}
                      disabled={isBusy || isSelf}
                      onChange={e => changeRole(user.id, e.target.value as Role)}
                      aria-label={`Role for ${user.fullName}`}
                    >
                      <option value="CITIZEN">CITIZEN</option>
                      <option value="WORKER">WORKER</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  {/* Actions (Revoke / Restore / Delete) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50 ${
                        user.active
                          ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                          : "btn-primary py-2 px-3 text-xs"
                      }`}
                      disabled={isBusy || isSelf}
                      onClick={() => setAccess(user)}
                    >
                      {user.active ? (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>Revoke Access</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Restore Access</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn-danger py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-40"
                      disabled={isBusy || isSelf}
                      onClick={() => deleteUser(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="py-14 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No matching users found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or role filter.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </RequireRole>
  );
}