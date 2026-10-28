"use client";

import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";

type Media = { id: string; filename: string; kind: "BEFORE" | "AFTER" };
type Complaint = { id: string; status: string; description: string; latitude: number; longitude: number; media: Media[] };
export type ResolutionTask = {
  task: { id: string; status: string; priority: string; assignedWorkerName?: string; resolutionNote?: string; boundaryGeoJson?: string };
  complaints: Complaint[];
};

type Props = { tasks: ResolutionTask[]; busyTaskId: string | null; onReview: (taskId: string, accepted: boolean) => void };

export function SupervisorResolutionReview({ tasks, busyTaskId, onReview }: Props) {
  return <section className="card">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Final verification</p><h2 className="mt-1 text-lg font-bold">Completed cleanups awaiting review</h2><p className="mt-1 text-sm text-slate-600">Compare the citizen’s original evidence with the worker’s after-cleanup photos. Verify to close the complaint or request rework.</p></div><span className="badge bg-violet-50 text-violet-800 ring-violet-600/20">{tasks.length} awaiting review</span></div>
    {tasks.length === 0 ? <p className="empty-state">No cleanup submissions are waiting for verification.</p> : <div className="space-y-6">
      {tasks.map(({ task, complaints }) => <article key={task.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div><p className="mt-3 text-sm text-slate-700">Worker: <strong>{task.assignedWorkerName ?? "Assigned worker"}</strong></p>{task.resolutionNote && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>Worker note:</strong> {task.resolutionNote}</p>}</div></div>
        <AssignedTaskMap className="mt-5" boundaryGeoJson={task.boundaryGeoJson} latitude={complaints[0]?.latitude} longitude={complaints[0]?.longitude} />
        <div className="mt-5 space-y-5">{complaints.map(complaint => {
          const before = complaint.media.filter(media => media.kind === "BEFORE");
          const after = complaint.media.filter(media => media.kind === "AFTER");
          return <section className="rounded-lg bg-slate-50 p-4" key={complaint.id}>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge value={complaint.status} /></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{complaint.description}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Before cleanup</p>{before.length ? <div className="mt-2 grid grid-cols-2 gap-2">{before.map(media => <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={media.id}><PrivateImage assetId={media.id} alt={`Before cleanup: ${media.filename}`} className="h-32 w-full object-cover" /><figcaption className="truncate p-2 text-xs text-slate-600">{media.filename}</figcaption></figure>)}</div> : <p className="mt-2 text-sm text-slate-500">No original image attached.</p>}</div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">After cleanup</p>{after.length ? <div className="mt-2 grid grid-cols-2 gap-2">{after.map(media => <figure className="overflow-hidden rounded-lg border border-emerald-200 bg-white" key={media.id}><PrivateImage assetId={media.id} alt={`After cleanup: ${media.filename}`} className="h-32 w-full object-cover" /><figcaption className="truncate p-2 text-xs text-slate-600">{media.filename}</figcaption></figure>)}</div> : <p className="mt-2 text-sm text-red-700">No after-cleanup image was supplied.</p>}</div>
            </div>
          </section>;
        })}</div>
        <div className="mt-5 flex flex-wrap gap-2"><button className="btn-primary" disabled={busyTaskId === task.id} onClick={() => onReview(task.id, true)}>{busyTaskId === task.id ? "Saving…" : "Verify & close complaint"}</button><button className="btn-danger" disabled={busyTaskId === task.id} onClick={() => onReview(task.id, false)}>Request rework</button></div>
      </article>)}
    </div>}
  </section>;
}
