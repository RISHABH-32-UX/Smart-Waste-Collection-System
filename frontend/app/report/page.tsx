"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { CameraCapture } from "../../components/CameraCapture";
import {
  ClipboardList,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  ShieldCheck,
  FileText,
  Sparkles,
} from "lucide-react";

type Complaint = {
  id: string;
  status: string;
  description: string;
  severity?: string;
  createdAt: string;
};

function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  );
}

export default function ReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [history, setHistory] = useState<Complaint[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setHistory(await api<Complaint[]>("/complaints"));
    } catch {
      /* User may not be signed in yet or mock fallback active */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Please capture or attach a site photo first.");
      setIsError(true);
      return;
    }
    setBusy(true);
    try {
      setMessage("Acquiring GPS location and uploading photo…");
      setIsError(false);
      const form = new FormData();
      form.append("file", file);
      const upload = await api<{ assetId: string }>("/uploads", { method: "POST", body: form });
      const location = await locate();
      await api("/complaints", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          description,
          location,
          beforeAssetIds: [upload.assetId],
        }),
      });
      setDescription("");
      setFile(null);
      setMessage("Report successfully submitted! It has been dispatched to the supervisor triage queue.");
      setIsError(false);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submission failed. Please check permissions and try again.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireRole role="CITIZEN">
      <main className="app-shell max-w-6xl space-y-8">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Citizen Reporting Portal</span>
              </p>
              <h1 className="page-title">Report Waste & Hotspots</h1>
              <p className="page-subtitle">
                Help keep your municipality clean. Capture an on-site photo, describe the waste condition, and submit with automatic GPS tagging for rapid municipal dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 border border-emerald-200/80 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Verified Municipal Hotline</span>
            </div>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium transition-all animate-fade-in ${
              isError
                ? "border border-red-200 bg-red-50/90 text-red-900 shadow-xs"
                : "border border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-xs"
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

        {/* Dual Column Layout */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Complaint Submission Form (5 cols) */}
          <section className="card lg:col-span-5 shadow-card space-y-5 border-slate-200/90">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-700" />
                <span>New Incident Report</span>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                All fields marked with an asterisk are required for municipal triage.
              </p>
            </div>

            <form className="space-y-5" onSubmit={submit}>
              {/* Photo Upload / Camera */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="field-label mb-0">
                    Site Photo <span className="text-red-500 font-bold">*</span>
                  </p>
                  {file && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3">
                  <CameraCapture disabled={busy} onCapture={setFile} />
                  {file && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                      <span className="truncate">Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="field-label mb-0" htmlFor="description">
                    Description & Landmarks <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{description.length}/500</span>
                </div>
                <textarea
                  id="description"
                  className="field min-h-28 text-sm resize-y"
                  placeholder="Describe the waste type, approximate volume, and notable landmarks (e.g. corner of 4th Ave, near municipal park gate)..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>

              {/* Automatic GPS Location Banner */}
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 text-xs text-blue-950">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <div className="leading-5">
                  <span className="font-semibold text-blue-900">High-Precision Geolocation:</span> Your device’s exact GPS coordinates will be captured at submission time to map this report.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full py-3 text-sm font-bold shadow-md shadow-emerald-900/10"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Report…</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Waste Report</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right Column: Complaint History Tracking (7 cols) */}
          <section className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                  <span>My Submitted Reports</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Track the real-time status of your reports through supervisor verification and cleanup.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                {history.length} {history.length === 1 ? "Report" : "Reports"}
              </span>
            </div>

            {/* Complaint List Cards */}
            <div className="space-y-3">
              {history.map(c => {
                const dateObj = new Date(c.createdAt);
                const formattedDate = isNaN(dateObj.getTime())
                  ? c.createdAt
                  : dateObj.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                return (
                  <article
                    className="card-compact hover:-translate-y-0.5 transition-all duration-150 border-slate-200/90 shadow-card bg-white"
                    key={c.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          #{c.id.slice(0, 8)}
                        </span>
                        <StatusBadge value={c.status} />
                      </div>
                      {c.severity && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400">AI Priority:</span>
                          <StatusBadge value={c.severity} />
                        </div>
                      )}
                    </div>

                    <p className="mt-2.5 text-sm leading-relaxed text-slate-800 font-medium">
                      {c.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100/80 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {c.status === "RESOLVED" || c.status === "CLOSED"
                          ? "Cleanup Verified"
                          : c.status === "IN_PROGRESS" || c.status === "ON_SITE"
                          ? "Worker En Route"
                          : "In Verification Queue"}
                      </span>
                    </div>
                  </article>
                );
              })}

              {history.length === 0 && (
                <div className="card rounded-2xl border-dashed border-2 border-slate-200 bg-slate-50/50 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-xs mb-3">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No reports submitted yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    When you report waste hotspots in your community, your tickets and real-time status updates will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </RequireRole>
  );
}