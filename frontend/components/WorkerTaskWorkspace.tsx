"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";
import { Check } from "lucide-react";

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
    setDetail(null); setFiles([]); setNote(""); setMessage("");
    api<TaskDetail>(`/worker/tasks/${taskId}`)
      .then(result => { if (active) { setDetail(result); setNote(result.task.resolutionNote ?? ""); } })
      .catch(cause => { if (active) { setMessage(cause instanceof Error ? cause.message : "Unable to load this task."); setIsError(true); } });
    return () => { active = false; };
  }, [taskId]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setMessage("Use JPEG, PNG, or WEBP cleanup photos only."); setIsError(true); return;
    }
    if (selected.some(file => file.size > 10 * 1024 * 1024)) {
      setMessage("Each cleanup photo must be 10 MB or smaller."); setIsError(true); return;
    }
    setFiles(selected); setMessage("");
  }

  async function markArrived() {
    setBusy(true);
    setMessage("");
    try {
      await api(`/worker/tasks/${taskId}/arrive`, { method: "POST" });
      setDetail(current => current ? { ...current, task: { ...current.task, status: "ON_SITE" } } : current);
      setMessage("You have arrived at the collection site. You can now take after-cleanup photos and submit your work.");
      setIsError(false);
      onResolutionSubmitted();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update arrival status.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitCleanup() {
    if (!detail || files.length === 0) {
      setMessage("Add at least one after-cleanup photo before submitting."); setIsError(true); return;
    }
    setBusy(true); setMessage("");
    try {
      const uploads = await Promise.all(files.map(async file => {
        const formData = new FormData();
        formData.append("file", file);
        return api<UploadResponse>("/uploads", { method: "POST", body: formData });
      }));
      await api(`/worker/tasks/${taskId}/resolution`, {
        method: "POST",
        body: JSON.stringify({ afterAssetIds: uploads.map(upload => upload.assetId), note }),
      });
      setDetail(current => current ? { ...current, task: { ...current.task, status: "RESOLUTION_SUBMITTED", resolutionNote: note || undefined } } : current);
      setFiles([]);
      setMessage("Cleanup evidence submitted. The supervisor will verify it before the complaint is closed."); setIsError(false);
      onResolutionSubmitted();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to submit cleanup evidence."); setIsError(true);
    } finally { setBusy(false); }
  }

  if (!detail && !message) return <section className="card"><p className="text-sm text-slate-500">Loading task details…</p></section>;
  if (!detail) return <section className="card"><p className="alert-error">{message}</p><button className="btn-secondary mt-4" onClick={onClose}>Back to my tasks</button></section>;

  const primaryLocation = detail.complaints[0];
  const isAssigned = detail.task.status === "ASSIGNED" || detail.task.status === "ACCEPTED";
  const canSubmit = detail.task.status === "ON_SITE" || detail.task.status === "REWORK_REQUIRED";
  const beforePhotos = (complaint: TaskComplaint) => complaint.media.filter(media => media.kind === "BEFORE");
  const afterPhotos = (complaint: TaskComplaint) => complaint.media.filter(media => media.kind === "AFTER");

  return (
    <section className="card space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <span className="eyebrow">Task Execution</span>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">Assigned Collection Site</h2>
          <p className="mt-1 text-xs text-slate-500">Review citizen reports, navigate to the geofence perimeter, and submit photographic proof of cleanup.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={onClose}>
          ← Back to Task List
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5">
        <div className="flex items-center gap-2">
          <StatusBadge value={detail.task.priority} />
          <StatusBadge value={detail.task.status} />
          <span className="text-xs text-slate-500">
            Due: <strong className="text-slate-800">{detail.task.dueAt ? new Date(detail.task.dueAt).toLocaleString() : "Immediate"}</strong>
          </span>
        </div>

        {isAssigned && (
          <button
            className="btn-primary btn-sm inline-flex items-center gap-1.5"
            disabled={busy}
            onClick={markArrived}
          >
            {busy ? (
              "Updating…"
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Arrived at Site</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Map Section */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Assigned Geofenced Location</h3>
            <p className="text-xs text-slate-500">The marker identifies reported hotspot. Ensure physical presence inside the 50m radius.</p>
          </div>
          <span className="badge bg-emerald-50 text-brand-700 ring-brand-600/20 font-mono text-[10px]">
            GPS ACTIVE
          </span>
        </div>
        <AssignedTaskMap
          className="mt-2"
          boundaryGeoJson={detail.task.boundaryGeoJson}
          latitude={primaryLocation?.latitude}
          longitude={primaryLocation?.longitude}
        />
      </section>

      {/* Citizen Complaint Evidence */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Citizen Complaint Evidence ({detail.complaints.length})
        </h3>
        {detail.complaints.map(complaint => (
          <article className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4" key={complaint.id}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={complaint.status} />
                {complaint.severity && <StatusBadge value={complaint.severity} />}
              </div>
              <span className="font-mono text-xs text-slate-400">
                {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-800 font-medium">{complaint.description}</p>
            
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Before-Cleanup Photos</p>
              {beforePhotos(complaint).length ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {beforePhotos(complaint).map(media => (
                    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" key={media.id}>
                      <PrivateImage assetId={media.id} alt={`Before cleanup: ${media.filename}`} className="h-44 w-full object-cover" />
                      <figcaption className="truncate p-2 text-[11px] font-medium text-slate-600">{media.filename}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No original evidence photo attached.</p>
              )}
            </div>

            {afterPhotos(complaint).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Submitted After-Cleanup Photos</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {afterPhotos(complaint).map(media => (
                    <figure className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm" key={media.id}>
                      <PrivateImage assetId={media.id} alt={`After cleanup: ${media.filename}`} className="h-44 w-full object-cover" />
                      <figcaption className="truncate p-2 text-[11px] font-medium text-emerald-800">{media.filename}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      {message && (
        <div className={isError ? "alert-error" : "alert-success"}>
          <p className="font-semibold text-xs">{isError ? "Error" : "Update"}</p>
          <p className="mt-0.5 text-xs">{message}</p>
        </div>
      )}

      {/* Arrival Action Card */}
      {isAssigned && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
          <h4 className="text-sm font-bold text-blue-950">Reached the Collection Site?</h4>
          <p className="mt-1 text-xs leading-relaxed text-blue-900">
            Confirm your arrival to update task status to ON_SITE and unlock after-cleanup evidence submission.
          </p>
          <button
            className="btn-primary btn-sm mt-3 bg-blue-700 hover:bg-blue-800 inline-flex items-center gap-1.5"
            disabled={busy}
            onClick={markArrived}
          >
            {busy ? (
              "Updating…"
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm On-Site Arrival</span>
              </>
            )}
          </button>
        </section>
      )}

      {/* Resolution Submission Card */}
      {canSubmit && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5">
          <h4 className="text-sm font-bold text-brand-950">Submit Cleanup for Supervisor Verification</h4>
          <p className="mt-1 text-xs leading-relaxed text-brand-900">
            Upload clear photographic proof of the cleared site. The complaint will be closed upon supervisor review.
          </p>
          
          <div className="mt-4">
            <label className="field-label" htmlFor="after-photos">Upload After-Cleanup Photos</label>
            <input
              id="after-photos"
              className="field bg-white text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={chooseFiles}
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs font-semibold text-brand-800">
                Selected: {files.map(file => file.name).join(", ")}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="resolution-note">
              Completion Notes <span className="font-normal text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="resolution-note"
              className="field min-h-20 resize-y bg-white text-xs leading-5"
              maxLength={2000}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="e.g. Cleared 3 bags of municipal debris. Washed surrounding pavement."
            />
          </div>

          <button
            className="btn-primary btn-sm mt-4 w-full sm:w-auto"
            disabled={busy || files.length === 0}
            onClick={submitCleanup}
          >
            {busy ? "Uploading Evidence…" : detail.task.status === "REWORK_REQUIRED" ? "Resubmit Cleanup Evidence →" : "Submit Cleanup for Review →"}
          </button>
        </section>
      )}

      {detail.task.status === "RESOLUTION_SUBMITTED" && (
        <div className="alert-success">
          <p className="font-semibold text-xs">Evidence Under Review</p>
          <p className="mt-0.5 text-xs">Cleanup evidence has been transmitted to municipal supervisors. You will receive notification if rework is required.</p>
        </div>
      )}
    </section>
  );
}
