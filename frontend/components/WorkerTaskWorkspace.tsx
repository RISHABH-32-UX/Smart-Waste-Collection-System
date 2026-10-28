"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Navigation,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

type TaskMedia = { id: string; filename: string; contentType: string; sizeBytes: number; kind: "BEFORE" | "AFTER" };
type TaskComplaint = { id: string; status: string; description: string; latitude: number; longitude: number; severity?: string; createdAt: string; media: TaskMedia[] };
type TaskDetail = {
  task: { id: string; status: string; priority: string; dueAt?: string; resolutionNote?: string; boundaryGeoJson?: string };
  complaints: TaskComplaint[];
};
type UploadResponse = { assetId: string; filename: string; contentType: string; sizeBytes: number };

type Props = { taskId: string; onClose: () => void; onResolutionSubmitted: () => void };

export function WorkerTaskWorkspace({ taskId, onClose, onResolutionSubmitted }: Props) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setFiles([]);
    setNote("");
    setMessage("");
    api<TaskDetail>(`/worker/tasks/${taskId}`)
      .then(result => {
        if (active) {
          setDetail(result);
          setNote(result.task.resolutionNote ?? "");
        }
      })
      .catch(cause => {
        if (active) {
          setMessage(cause instanceof Error ? cause.message : "Unable to load this task.");
          setIsError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setMessage("Please select JPEG, PNG, or WEBP cleanup photos only.");
      setIsError(true);
      return;
    }
    if (selected.some(file => file.size > 10 * 1024 * 1024)) {
      setMessage("Each cleanup photo must be 10 MB or smaller.");
      setIsError(true);
      return;
    }
    setFiles(selected);
    setMessage("");
  }

  async function submitCleanup() {
    if (!detail || files.length === 0) {
      setMessage("Please attach at least one after-cleanup photograph before submitting.");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const uploads = await Promise.all(
        files.map(async file => {
          const formData = new FormData();
          formData.append("file", file);
          return api<UploadResponse>("/uploads", { method: "POST", body: formData });
        })
      );
      await api(`/worker/tasks/${taskId}/resolution`, {
        method: "POST",
        body: JSON.stringify({ afterAssetIds: uploads.map(upload => upload.assetId), note }),
      });
      setDetail(current =>
        current
          ? {
              ...current,
              task: {
                ...current.task,
                status: "RESOLUTION_SUBMITTED",
                resolutionNote: note || undefined,
              },
            }
          : current
      );
      setFiles([]);
      setMessage("Cleanup evidence submitted successfully! The supervisor has been notified to verify before closing.");
      setIsError(false);
      onResolutionSubmitted();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to submit cleanup evidence.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !message) {
    return (
      <section className="card p-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-medium text-slate-600">Loading task details and geofence map…</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="card space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{message}</span>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-1.5" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Tasks</span>
        </button>
      </section>
    );
  }

  const primaryLocation = detail.complaints[0];
  const canSubmit = detail.task.status === "ON_SITE" || detail.task.status === "REWORK_REQUIRED";
  const beforePhotos = (complaint: TaskComplaint) => complaint.media.filter(media => media.kind === "BEFORE");
  const afterPhotos = (complaint: TaskComplaint) => complaint.media.filter(media => media.kind === "AFTER");

  const dueObj = detail.task.dueAt ? new Date(detail.task.dueAt) : null;
  const formattedDue = dueObj && !isNaN(dueObj.getTime())
    ? dueObj.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

  return (
    <section className="card space-y-7 border-slate-200/90 shadow-card">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            onClick={onClose}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to task list</span>
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Task Workspace</h2>
            <span className="font-mono text-xs font-semibold text-slate-400">
              #{detail.task.id.slice(0, 8)}
            </span>
            <StatusBadge value={detail.task.status} />
            <StatusBadge value={detail.task.priority} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Review citizen evidence, check in inside the geofence perimeter, and submit cleanup proof.
          </p>
        </div>

        {/* Due Date Indicator */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-700">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>Due: <strong className="text-slate-900 font-semibold">{formattedDue}</strong></span>
        </div>
      </div>

      {/* Interactive Map & Geofence Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-emerald-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Assigned Collection Site & Geofence
            </h3>
          </div>
          {primaryLocation && (
            <span className="font-mono text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {primaryLocation.latitude.toFixed(5)}, {primaryLocation.longitude.toFixed(5)}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
          <AssignedTaskMap
            boundaryGeoJson={detail.task.boundaryGeoJson}
            latitude={primaryLocation?.latitude}
            longitude={primaryLocation?.longitude}
          />
        </div>
      </section>

      {/* Citizen Complaint Details & Original Evidence */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-700" />
          <span>Citizen Report Information ({detail.complaints.length})</span>
        </h3>

        {detail.complaints.map(complaint => (
          <article
            className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 space-y-4"
            key={complaint.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <div className="flex items-center gap-2">
                <StatusBadge value={complaint.status} />
                {complaint.severity && <StatusBadge value={complaint.severity} />}
              </div>
              <span className="font-mono text-xs text-slate-400">
                Lat/Lng: {complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Citizen Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {complaint.description}
              </p>
            </div>

            {/* Before Photos */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>Original Hotspot Evidence (Before Cleanup)</span>
              </p>
              {beforePhotos(complaint).length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {beforePhotos(complaint).map(media => (
                    <figure
                      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
                      key={media.id}
                    >
                      <PrivateImage
                        assetId={media.id}
                        alt={`Before cleanup: ${media.filename}`}
                        className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <figcaption className="truncate p-2.5 text-xs text-slate-600 font-medium">
                        {media.filename}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No before-cleanup photograph was attached to this report.</p>
              )}
            </div>

            {/* After Photos if already submitted */}
            {afterPhotos(complaint).length > 0 && (
              <div className="border-t border-slate-200/70 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Submitted Cleanup Proof (After Cleanup)</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {afterPhotos(complaint).map(media => (
                    <figure
                      className="group overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-xs"
                      key={media.id}
                    >
                      <PrivateImage
                        assetId={media.id}
                        alt={`After cleanup: ${media.filename}`}
                        className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <figcaption className="truncate p-2.5 text-xs text-emerald-900 font-medium">
                        {media.filename}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Status Feedback */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ${
            isError
              ? "border border-red-200 bg-red-50 text-red-900"
              : "border border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          {isError ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <span className="leading-5">{message}</span>
        </div>
      )}

      {/* Resolution Submission Section (when on site or rework required) */}
      {canSubmit && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4">
          <div className="border-b border-emerald-200/80 pb-3">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-700" />
              <span>Submit Cleanup Evidence for Supervisor Verification</span>
            </h3>
            <p className="mt-1 text-xs text-emerald-900/90 leading-5">
              Upload at least one real-time after-cleanup image to prove site clearance. The ticket will close once the supervisor accepts this evidence.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="field-label text-emerald-950" htmlFor="after-photos">
              After-Cleanup Photos <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="after-photos"
              className="field bg-white text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={chooseFiles}
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {files.map(file => (
                  <span
                    key={file.name}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="field-label text-emerald-950" htmlFor="resolution-note">
                Completion Notes <span className="font-normal text-slate-500">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">{note.length}/2000</span>
            </div>
            <textarea
              id="resolution-note"
              className="field min-h-24 bg-white text-sm resize-y"
              maxLength={2000}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Describe the cleanup operations performed (e.g. collected 3 bags of municipal refuse, cleared roadside ditch, disinfected perimeter)..."
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 shadow-md shadow-emerald-900/10 font-bold"
              disabled={busy || files.length === 0}
              onClick={submitCleanup}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading Cleanup Evidence…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>
                    {detail.task.status === "REWORK_REQUIRED"
                      ? "Resubmit Corrected Cleanup Evidence"
                      : "Submit for Supervisor Review"}
                  </span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {detail.task.status === "RESOLUTION_SUBMITTED" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-5">
            <strong>Cleanup Evidence Under Review:</strong> Your photos have been dispatched to the supervisor triage hub. You will be notified via this workspace if rework is required.
          </div>
        </div>
      )}
    </section>
  );
}