"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireAuth } from "../../components/RequireAuth";

type Profile = { id: string; fullName: string; email: string; phone?: string; role: string; active: boolean; createdAt: string };

const roleSummary: Record<string, string> = {
  CITIZEN: "You can submit waste reports and follow each complaint through to closure.",
  WORKER: "You can view assigned field tasks, confirm arrival, and submit cleanup evidence.",
  SUPERVISOR: "You can verify citizen reports, allocate workers, and validate completed cleanups.",
  ADMIN: "You can manage user roles, view operational analytics, and review system activity.",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Profile>("/profile").then(setProfile).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load your profile."));
  }, []);

  return <RequireAuth>
    <main className="app-shell max-w-3xl">
      <div className="page-header"><p className="eyebrow">Account</p><h1 className="page-title">My profile</h1><p className="page-subtitle">Your account and access details for CleanCity.</p></div>
      {error && <p className="alert-error">{error}</p>}
      {!profile && !error && <p className="empty-state">Loading your profile…</p>}
      {profile && <section className="card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5"><div><p className="text-xl font-bold text-slate-950">{profile.fullName}</p><p className="mt-1 text-sm text-slate-600">{profile.email}</p></div><span className="badge-role">{profile.role}</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</p><p className="mt-2 text-sm font-medium text-slate-900">{profile.phone || "Not provided"}</p></div>
          <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Account status</p><p className="mt-2 text-sm font-medium text-emerald-800">{profile.active ? "Active" : "Inactive"}</p></div>
          <div className="rounded-lg bg-slate-50 p-4 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Member since</p><p className="mt-2 text-sm font-medium text-slate-900">{new Date(profile.createdAt).toLocaleString()}</p></div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Your {profile.role.toLowerCase()} access:</strong> {roleSummary[profile.role] ?? "Your access is managed by an administrator."}</div>
      </section>}
    </main>
  </RequireAuth>;
}
