"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { CameraCapture } from "../../components/CameraCapture";
import {
  Camera,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Inbox,
  ShieldCheck,
  Trash2,
  Truck,
  XCircle,
  FileText,
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
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  );
}

export default function ReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [history, setHistory] = useState<Complaint[]>([]);
  const [busy, setBusy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronize preview thumbnail with selected file
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  async function refresh() {
    setIsRefreshing(true);
    try {
      setHistory(await api<Complaint[]>("/complaints"));
    } catch {
      /* User may not be signed in yet or token expired. */
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Add a site photo first.");
      setIsError(true);
      return;
    }
    setBusy(true);
    try {
      setMessage("Getting secure location and uploading photo…");
      setIsError(false);
      const form = new FormData();
      form.append("file", file);
      const upload = await api<{ assetId: string }>("/uploads", {
        method: "POST",
        body: form,
      });
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
      setMessage("Complaint submitted for verification.");
      setIsError(false);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submission failed");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  function getLifecyclePill(status: string) {
    switch (status) {
      case "RESOLVED":
      case "CLEANED":
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case "ASSIGNED":
      case "ON_SITE":
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <Truck className="w-3 h-3" /> Dispatched
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <Clock className="w-3 h-3" /> Under Triage
          </span>
        );
    }
  }

  return (
    <RequireRole role="CITIZEN">
      <main className="app-shell grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]">
        {/* Left Column: Citizen Reporting Form */}
        <section className="card self-start p-6 sm:p-7 shadow-card rounded-2xl bg-white border border-slate-200/90">
          <div className="border-b border-slate-100 pb-5">
            <span className="eyebrow">Citizen Reporting</span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Report a Waste Hotspot
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Help make your neighbourhood cleaner. Submit photographic evidence
              and describe the waste issue so municipal teams can review it.
            </p>
          </div>

          <form className="mt-6 space-y-6" onSubmit={submit}>
            {/* Step 1: Photographic Evidence */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="field-label mb-0">
                  1. Site Photographic Evidence
                </label>
                <span className="text-[11px] font-medium text-brand-700">
                  Photo Required
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4">
                <CameraCapture disabled={busy} onCapture={setFile} />

                {/* Selected Image Preview Card */}
                {file && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition-all">
                    <div className="flex items-center gap-3">
                      {previewUrl ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-300 bg-slate-900 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Captured waste site evidence"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {file.name}
                          </p>
                          <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Ready
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB · Photographic evidence ready to submit
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        disabled={busy}
                        className="btn-secondary h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200 shrink-0 inline-flex items-center gap-1.5"
                        title="Remove and choose another photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Change</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Issue Description */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="field-label mb-0" htmlFor="description">
                  2. Issue Description & Landmarks
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  Required
                </span>
              </div>
              <textarea
                id="description"
                className="field min-h-28 resize-y text-xs leading-5 rounded-xl border-slate-300 p-3.5 placeholder:text-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                placeholder="Describe the nature of the waste, approximate volume, and landmark indicators (e.g. overflowing municipal bin beside North Gate, opposite market stall #12)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Detailed landmark indicators enable sanitary inspection teams to pinpoint waste quickly.
              </p>
            </div>

            {/* Step 3: Submission Action & Geolocation Assurance */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-sm transition-all hover:shadow-md hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 rounded-xl"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Securing GPS & Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Submit Report for Verification</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span>
                  High-accuracy GPS coordinates are validated automatically upon submission.
                </span>
              </div>
            </div>
          </form>

          {/* Status Feedback Messages */}
          {message && (
            <div
              className={`mt-6 rounded-xl border p-4 text-xs transition-all ${
                isError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                )}
                <p className="font-bold">
                  {isError ? "Submission Notice" : "Submission Successful"}
                </p>
              </div>
              <p className="mt-1 pl-6 text-slate-700">{message}</p>
            </div>
          )}
        </section>

        {/* Right Column: Submitted Complaints History / Transparency Log */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="eyebrow">Transparency Log</span>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                My Filed Reports
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Live chronological updates on your submitted reports through municipal inspection.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="badge bg-slate-100 text-slate-700 ring-slate-500/20 font-bold px-3 py-1">
                {history.length} {history.length === 1 ? "report" : "reports"}
              </span>
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                title="Refresh complaints list"
                className="btn-secondary h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 shadow-2xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRefreshing ? "animate-spin text-brand-700" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {history.map((c) => (
              <article
                className="card p-4 sm:p-5 shadow-2xs transition-all hover:border-brand-300 hover:shadow-card rounded-xl border border-slate-200/90 bg-white space-y-3"
                key={c.id}
              >
                {/* Header row: Status badges and formatted timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge value={c.status} />
                    {c.severity && <StatusBadge value={c.severity} />}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Body: Report description */}
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
                  {c.description}
                </p>

                {/* Footer row: Identifier and Lifecycle Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100/80 text-[11px]">
                  <span className="font-mono font-semibold text-slate-400">
                    REF #{c.id.slice(0, 8).toUpperCase()}
                  </span>

                  <div>{getLifecyclePill(c.status)}</div>
                </div>
              </article>
            ))}

            {/* Empty State */}
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                  <Inbox className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No reports submitted yet
                </h3>
                <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed text-slate-500">
                  Your submitted waste reports will appear here with their latest available status.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </RequireRole>
  );
}
