"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";

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

  return <section className="card space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
      <div><p className="eyebrow">Task workspace</p><h2 className="mt-1 text-xl font-bold text-slate-950">Assigned collection site</h2><p className="mt-1 text-sm text-slate-600">Review the report, navigate to the site, then submit proof of cleanup.</p></div>
      <button className="btn-secondary" onClick={onClose}>Back to tasks</button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge value={detail.task.priority} />
      <StatusBadge value={detail.task.status} />
      {isAssigned && (
        <button
          className="btn-primary ml-auto text-sm"
          disabled={busy}
          onClick={markArrived}
        >
          {busy ? "Updating..." : "✅ Reached Destination / Start Work"}
        </button>
      )}
    </div>
    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Due: <strong>{detail.task.dueAt ? new Date(detail.task.dueAt).toLocaleString() : "Not set"}</strong></div>

    <section>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned location</p>
      <p className="mt-2 text-sm text-slate-600">The marker identifies the reported collection point. The map area covers the task geofence.</p>
      <AssignedTaskMap className="mt-3" boundaryGeoJson={detail.task.boundaryGeoJson} latitude={primaryLocation?.latitude} longitude={primaryLocation?.longitude} />
    </section>

    <section className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Citizen complaint{detail.complaints.length === 1 ? "" : "s"}</p>
      {detail.complaints.map(complaint => <article className="rounded-xl border border-slate-200 p-4" key={complaint.id}>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge value={complaint.status} />{complaint.severity && <StatusBadge value={complaint.severity} />}</div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{complaint.description}</p>
        <p className="mt-2 font-mono text-xs text-slate-500">{complaint.latitude.toFixed(6)}, {complaint.longitude.toFixed(6)}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Before-cleanup evidence</p>
        {beforePhotos(complaint).length ? <div className="mt-2 grid gap-3 sm:grid-cols-2">{beforePhotos(complaint).map(media => <figure className="overflow-hidden rounded-lg border border-slate-200" key={media.id}><PrivateImage assetId={media.id} alt={`Before cleanup: ${media.filename}`} className="h-44 w-full object-cover" /><figcaption className="truncate p-2 text-xs text-slate-600">{media.filename}</figcaption></figure>)}</div> : <p className="mt-2 text-sm text-slate-500">No before-cleanup photo was attached.</p>}
        {afterPhotos(complaint).length > 0 && <><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Submitted cleanup evidence</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{afterPhotos(complaint).map(media => <figure className="overflow-hidden rounded-lg border border-slate-200" key={media.id}><PrivateImage assetId={media.id} alt={`After cleanup: ${media.filename}`} className="h-44 w-full object-cover" /><figcaption className="truncate p-2 text-xs text-slate-600">{media.filename}</figcaption></figure>)}</div></>}
      </article>)}
    </section>

    {message && <p className={isError ? "alert-error" : "alert-success"}>{message}</p>}
    {isAssigned && (
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-950">Reached the cleanup site?</p>
        <p className="mt-1 text-sm leading-6 text-blue-900">
          Once you have reached your destination, click below to proceed to the task and unlock after-cleanup photo submission.
        </p>
        <button
          className="btn-primary mt-3"
          disabled={busy}
          onClick={markArrived}
        >
          {busy ? "Updating..." : "✅ Reached Destination / Proceed to Task"}
        </button>
      </section>
    )}
    {canSubmit && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-950">Submit cleanup for supervisor verification</p>
      <p className="mt-1 text-sm leading-6 text-emerald-900">Upload at least one real-time after-cleanup image. The complaint is closed only when the supervisor accepts the evidence.</p>
      <label className="field-label mt-4" htmlFor="after-photos">After-cleanup photos</label>
      <input id="after-photos" className="field bg-white" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} />
      {files.length > 0 && <p className="mt-2 text-sm text-emerald-900">{files.map(file => file.name).join(", ")}</p>}
      <label className="field-label mt-4" htmlFor="resolution-note">Completion note <span className="font-normal text-slate-500">(optional)</span></label>
      <textarea id="resolution-note" className="field min-h-24 bg-white" maxLength={2000} value={note} onChange={event => setNote(event.target.value)} placeholder="Describe the cleanup completed at the site." />
      <button className="btn-primary mt-4" disabled={busy || files.length === 0} onClick={submitCleanup}>{busy ? "Uploading evidence…" : detail.task.status === "REWORK_REQUIRED" ? "Resubmit cleanup evidence" : "Submit for supervisor review"}</button>
    </section>}
    {detail.task.status === "RESOLUTION_SUBMITTED" && <p className="alert-success">Cleanup evidence has been sent to the supervisor. You will be notified through the task status if rework is needed.</p>}
  </section>;
}
