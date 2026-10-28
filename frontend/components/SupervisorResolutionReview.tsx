"use client";

import { AssignedTaskMap } from "./AssignedTaskMap";
import { PrivateImage } from "./PrivateImage";
import { StatusBadge } from "./StatusBadge";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  User,
  MessageSquare,
  Clock,
  Sparkles,
  MapPin,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

type Media = { id: string; filename: string; kind: "BEFORE" | "AFTER" };
type Complaint = { id: string; status: string; description: string; latitude: number; longitude: number; media: Media[] };
export type ResolutionTask = {
  task: { id: string; status: string; priority: string; assignedWorkerName?: string; resolutionNote?: string; boundaryGeoJson?: string };
  complaints: Complaint[];
};

type Props = { tasks: ResolutionTask[]; busyTaskId: string | null; onReview: (taskId: string, accepted: boolean) => void };

export function SupervisorResolutionReview({ tasks, busyTaskId, onReview }: Props) {
  return (
    <section className="card space-y-6 border-slate-200/90 shadow-card">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="eyebrow">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>Final Quality Assurance</span>
          </p>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Completed Cleanups Awaiting Review</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare the citizen’s original evidence with the worker’s post-cleanup photos. Verify to close the ticket or return for rework.
          </p>
        </div>
        <span className="rounded-full bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-800 border border-purple-200 shadow-xs">
          {tasks.length} {tasks.length === 1 ? "Review Pending" : "Reviews Pending"}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border-dashed border-2 border-slate-200 bg-slate-50/50 py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">All Completed Cleanups Verified</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            No cleanup submissions are currently waiting for supervisor sign-off.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map(({ task, complaints }) => {
            const isBusy = busyTaskId === task.id;

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
              >
                {/* Task Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      #{task.id.slice(0, 8)}
                    </span>
                    <StatusBadge value={task.status} />
                    <StatusBadge value={task.priority} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Worker: <strong className="text-slate-900">{task.assignedWorkerName ?? "Assigned worker"}</strong></span>
                  </div>
                </div>

                {/* Worker Note if present */}
                {task.resolutionNote && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950">
                    <MessageSquare className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-blue-900">Worker Completion Note:</span>{" "}
                      <span className="leading-relaxed">{task.resolutionNote}</span>
                    </div>
                  </div>
                )}

                {/* Map */}
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                  <AssignedTaskMap
                    boundaryGeoJson={task.boundaryGeoJson}
                    latitude={complaints[0]?.latitude}
                    longitude={complaints[0]?.longitude}
                  />
                </div>

                {/* Comparison Gallery */}
                <div className="space-y-4">
                  {complaints.map(complaint => {
                    const before = complaint.media.filter(media => media.kind === "BEFORE");
                    const after = complaint.media.filter(media => media.kind === "AFTER");

                    return (
                      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3" key={complaint.id}>
                        <div className="flex items-center justify-between">
                          <StatusBadge value={complaint.status} />
                          <span className="font-mono text-xs text-slate-500">
                            {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-800 font-medium">
                          {complaint.description}
                        </p>

                        <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-200/60">
                          {/* Before cleanup column */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block">
                              Original Waste (Before)
                            </span>
                            {before.length ? (
                              <div className="grid grid-cols-2 gap-2">
                                {before.map(media => (
                                  <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={media.id}>
                                    <PrivateImage
                                      assetId={media.id}
                                      alt={`Before cleanup: ${media.filename}`}
                                      className="h-28 w-full object-cover"
                                    />
                                    <figcaption className="truncate p-1.5 text-[11px] text-slate-500">
                                      {media.filename}
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic py-4">No before photos attached.</p>
                            )}
                          </div>

                          {/* After cleanup column */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                              Cleaned Site (After)
                            </span>
                            {after.length ? (
                              <div className="grid grid-cols-2 gap-2">
                                {after.map(media => (
                                  <figure className="overflow-hidden rounded-lg border border-emerald-200 bg-white" key={media.id}>
                                    <PrivateImage
                                      assetId={media.id}
                                      alt={`After cleanup: ${media.filename}`}
                                      className="h-28 w-full object-cover"
                                    />
                                    <figcaption className="truncate p-1.5 text-[11px] text-emerald-900 font-medium">
                                      {media.filename}
                                    </figcaption>
                                  </figure>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-red-600 italic py-4">No cleanup photos provided!</p>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>

                {/* Supervisor Verification Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-1.5 py-2.5 px-5 text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/10"
                    disabled={isBusy}
                    onClick={() => onReview(task.id, true)}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span>{isBusy ? "Processing…" : "Verify & Close Ticket"}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-danger inline-flex items-center gap-1.5 py-2.5 px-4 text-xs sm:text-sm font-bold"
                    disabled={isBusy}
                    onClick={() => onReview(task.id, false)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Request Rework</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}