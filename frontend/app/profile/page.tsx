"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireAuth } from "../../components/RequireAuth";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";

type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt: string;
};

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
    api<Profile>("/profile")
      .then(setProfile)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load your profile."));
  }, []);

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <RequireAuth>
      <main className="app-shell max-w-3xl">
        <div className="page-header">
          <p className="eyebrow">
            <User className="h-3.5 w-3.5" />
            <span>ACCOUNT</span>
          </p>
          <h1 className="page-title">My profile</h1>
          <p className="page-subtitle">Your account and access details for PRAVDHAN.</p>
        </div>

        {error && (
          <div className="alert-error mb-6" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!profile && !error && (
          <div className="card p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <span className="h-5 w-5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading your profile…</p>
          </div>
        )}

        {profile && (
          <section className="card space-y-6 shadow-card-hover border-slate-200/90">
            {/* Header Profile Identity */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 font-extrabold text-xl text-white shadow-md shadow-emerald-900/10">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{profile.fullName}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{profile.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge-role px-3 py-1 text-xs">
                  <Shield className="h-3.5 w-3.5" />
                  <span>{profile.role}</span>
                </span>
              </div>
            </div>

            {/* Profile Detail Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Phone</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {profile.phone || <span className="font-normal text-slate-400">Not provided</span>}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                  <span>Account status</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {profile.active ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-800">Inactive</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 sm:col-span-2 transition hover:bg-white hover:shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Member since</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Role Privileges Banner */}
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-teal-50/50 p-4 text-sm leading-relaxed text-emerald-950">
              <Info className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
              <div>
                <strong className="font-semibold text-emerald-900">
                  Your {profile.role.toLowerCase()} access:
                </strong>{" "}
                <span className="text-emerald-900/90">
                  {roleSummary[profile.role] ?? "Your access is managed by an administrator."}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>
    </RequireAuth>
  );
}
