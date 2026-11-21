"use client";

import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";
import { Check } from "lucide-react";

type Media = { id: string; filename: string; kind: "BEFORE" | "AFTER" };
type Complaint = { id: string; status: string; description: string; latitude: number; longitude: number; media: Media[] };
export type ResolutionTask = {
  task: { id: string; status: string; priority: string; assignedWorkerName?: string; resolutionNote?: string; boundaryGeoJson?: string };
  complaints: Complaint[];
};

type Props = { tasks: ResolutionTask[]; busyTaskId: string | null; onReview: (taskId: string, accepted: boolean) => void };

export function SupervisorResolutionReview({ tasks, busyTaskId, onReview }: Props) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="eyebrow">Final Quality Audit</span>
          <h2 className="mt-1 text-lg font-extrabold text-slate-950">Completed Cleanups Awaiting Verification</h2>
          <p className="mt-0.5 text-xs text-slate-500">Compare the citizen's original photographic evidence with the field worker's resolution photos. Accept to close ticket or request rework.</p>
        </div>
        <span className="badge bg-violet-50 text-violet-800 ring-violet-600/20 font-bold">
          {tasks.length} awaiting review
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state p-8">
          <p className="font-bold text-slate-800">No Cleanups Pending Review</p>
          <p className="mt-1 text-xs text-slate-500">Worker submissions will appear here for before-and-after photo audit.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map(({ task, complaints }) => (
            <article key={task.id} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={task.priority} />
                    <StatusBadge value={task.status} />
                    <span className="font-mono text-xs text-slate-400">Task #{task.id.slice(0, 8)}</span>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-700">
                    Assigned Worker: <strong className="text-slate-900">{task.assignedWorkerName ?? "Assigned worker"}</strong>
                  </p>
                  {task.resolutionNote && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-700">
                      <strong className="text-slate-900">Worker Completion Note:</strong> {task.resolutionNote}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <AssignedTaskMap boundaryGeoJson={task.boundaryGeoJson} latitude={complaints[0]?.latitude} longitude={complaints[0]?.longitude} />
              </div>

              <div className="mt-5 space-y-4">
                {complaints.map(complaint => {
                  const before = complaint.media.filter(media => media.kind === "BEFORE");
                  const after = complaint.media.filter(media => media.kind === "AFTER");
                  return (
                    <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4" key={complaint.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={complaint.status} />
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed font-medium text-slate-800">{complaint.description}</p>
                      
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">1. Citizen's Before Photo</p>
                          {before.length ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {before.map(media => (
                                <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50" key={media.id}>
                                  <PrivateImage assetId={media.id} alt={`Before cleanup: ${media.filename}`} className="h-32 w-full object-cover" />
                                  <figcaption className="truncate p-1.5 text-[10px] text-slate-600">{media.filename}</figcaption>
                                </figure>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-400">No original image attached.</p>
                          )}
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">2. Worker's After Photo</p>
                          {after.length ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {after.map(media => (
                                <figure className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/30" key={media.id}>
                                  <PrivateImage assetId={media.id} alt={`After cleanup: ${media.filename}`} className="h-32 w-full object-cover" />
                                  <figcaption className="truncate p-1.5 text-[10px] text-emerald-800">{media.filename}</figcaption>
                                </figure>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-red-700">No after-cleanup image was supplied.</p>
                          )}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <button
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                  disabled={busyTaskId === task.id}
                  onClick={() => onReview(task.id, true)}
                >
                  {busyTaskId === task.id ? (
                    "Processing…"
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify & Close Complaint</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-danger btn-sm"
                  disabled={busyTaskId === task.id}
                  onClick={() => onReview(task.id, false)}
                >
                  Request Worker Rework
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
