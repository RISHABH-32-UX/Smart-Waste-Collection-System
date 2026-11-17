"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireAuth } from "../../components/RequireAuth";
import { ShieldCheck } from "lucide-react";

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

  return (
    <RequireAuth>
      <main className="app-shell max-w-3xl space-y-6">
        <div className="page-header">
          <p className="eyebrow">Account Settings</p>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your identity, security, and municipal access credentials for CleanCity.</p>
        </div>

        {error && (
          <div className="alert-error">
            <p className="font-semibold">Unable to fetch profile</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        )}

        {!profile && !error && (
          <div className="card text-center p-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-700 border-r-transparent" />
            <p className="mt-3 text-sm font-semibold text-slate-600">Retrieving account data…</p>
          </div>
        )}

        {profile && (
          <section className="card space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-xl font-black text-white shadow-md">
                  {profile.fullName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">{profile.fullName}</h2>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-role text-xs px-3 py-1">{profile.role}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile.active ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20" : "bg-red-50 text-red-800 ring-1 ring-red-600/20"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${profile.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  {profile.active ? "Active Account" : "Suspended"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Phone</p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">{profile.phone || "Not registered"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Member Since</p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">{new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 text-sm leading-6 text-brand-950">
              <div className="flex items-center gap-2 font-bold text-brand-900">
                <ShieldCheck className="w-4 h-4 text-brand-700" />
                <span>Role Privileges: {profile.role}</span>
              </div>
              <p className="mt-1 text-xs text-brand-800/90 leading-relaxed">
                {roleSummary[profile.role] ?? "Your access permissions are configured and managed by system administrators."}
              </p>
            </div>
          </section>
        )}
      </main>
    </RequireAuth>
  );
}
