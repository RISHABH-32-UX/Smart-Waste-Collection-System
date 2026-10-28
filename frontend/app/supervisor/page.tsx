"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { ComplaintDetailDialog } from "../../components/ComplaintDetailDialog";
import { RequireRole } from "../../components/RequireRole";
import { ResolutionTask, SupervisorResolutionReview } from "../../components/SupervisorResolutionReview";
import { StatusBadge } from "../../components/StatusBadge";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  User,
  Users,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type Complaint = {
  id: string;
  status: string;
  description: string;
  severity?: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Worker = {
  id: string;
  fullName: string;
  email: string;
  availability: "FREE" | "BUSY";
  activeTaskCount: number;
  queuedTaskCount: number;
};

type QueueTask = {
  id: string;
  status: string;
  priority: string;
  queuedForAt?: string;
  queuedWorkerName?: string;
};

type CreatedTask = {
  id: string;
  status: string;
  assignedWorkerName?: string;
  queuedWorkerName?: string;
};

type AssignmentMode = "IMMEDIATE" | "QUEUE_2_HOURS" | "QUEUE_3_HOURS";

export default function SupervisorPage() {
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns(prev => {
        const newCountdowns: Record<string, string> = {};
        Object.entries(prev).forEach(([taskId, queuedForAt]) => {
          const dueTime = new Date(queuedForAt).getTime();
          const now = Date.now();
          const diff = dueTime - now;
          if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            newCountdowns[taskId] = `${hours}h ${minutes}m`;
          } else {
            newCountdowns[taskId] = "0h 0m";
          }
        });
        return newCountdowns;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (queuedForAt?: string) => {
    if (!queuedForAt) return "";
    const dueTime = new Date(queuedForAt).getTime();
    const now = Date.now();
    const diff = dueTime - now;
    if (diff <= 0) return "0h 0m";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const [verificationItems, setVerificationItems] = useState<Complaint[]>([]);
  const [readyItems, setReadyItems] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<QueueTask[]>([]);
  const [resolutionReviewTasks, setResolutionReviewTasks] = useState<ResolutionTask[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [detailComplaintId, setDetailComplaintId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState("");
  const [mode, setMode] = useState<AssignmentMode>("IMMEDIATE");
  const [priority, setPriority] = useState("MEDIUM");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);

  const selectedWorker = useMemo(
    () => workers.find(worker => worker.id === workerId),
    [workers, workerId]
  );
  const freeWorkers = useMemo(
    () => workers.filter(worker => worker.availability === "FREE"),
    [workers]
  );

  async function refresh() {
    try {
      const [verification, ready, availability, queue, resolutions] = await Promise.all([
        api<Complaint[]>("/supervisor/verification-queue"),
        api<Complaint[]>("/supervisor/assignment-ready"),
        api<Worker[]>("/supervisor/workers/availability"),
        api<QueueTask[]>("/supervisor/tasks/assignment-queue"),
        api<ResolutionTask[]>("/supervisor/tasks/resolution-review-queue"),
      ]);
      setVerificationItems(verification);
      setReadyItems(ready);
      setWorkers(availability);
      setQueuedTasks(queue);
      setResolutionReviewTasks(resolutions);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the supervisor workspace.");
      setIsError(true);
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function review(id: string, decision: "APPROVE" | "REJECT") {
    try {
      const complaint = await api<Complaint>(`/supervisor/complaints/${id}/verification`, {
        method: "POST",
        body: JSON.stringify({ decision, severity: "MEDIUM" }),
      });
      setMessage(
        decision === "APPROVE"
          ? "Report verified! Selected for immediate worker allocation."
          : "Report rejected and archived."
      );
      setIsError(false);
      if (decision === "APPROVE") {
        openAssignment(complaint);
      } else {
        await refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review verification failed.");
      setIsError(true);
    }
  }

  function openAssignment(complaint: Complaint) {
    setSelected(complaint);
    const firstFree = workers.find(worker => worker.availability === "FREE");
    const firstBusy = workers.find(
      worker => worker.availability === "BUSY" && worker.queuedTaskCount === 0
    );
    setWorkerId(firstFree?.id ?? firstBusy?.id ?? "");
    setMode(firstFree ? "IMMEDIATE" : "QUEUE_2_HOURS");
    setPriority("MEDIUM");
  }

  function selectWorker(value: string) {
    setWorkerId(value);
    const worker = workers.find(item => item.id === value);
    if (freeWorkers.length > 0 && worker?.availability === "BUSY") {
      setWorkerId(freeWorkers[0].id);
      setMode("IMMEDIATE");
      return;
    }
    if (worker?.availability === "FREE") {
      setMode("IMMEDIATE");
    } else if (worker) {
      setMode("QUEUE_2_HOURS");
    }
  }

  async function allocate() {
    if (!selected || !selectedWorker) return;
    const wantsQueue = mode !== "IMMEDIATE";
    if (freeWorkers.length > 0 && selectedWorker.availability !== "FREE") {
      setMessage("A free worker is available. Please select a free worker for immediate assignment.");
      setIsError(true);
      return;
    }
    if (!wantsQueue && selectedWorker.availability !== "FREE") {
      setMessage("This worker is currently busy. Queue the task for two or three hours, or select a free worker.");
      setIsError(true);
      return;
    }
    if (wantsQueue && selectedWorker.availability !== "BUSY") {
      setMessage("Queueing is intended for busy workers. Choose immediate assignment instead.");
      setIsError(true);
      return;
    }
    if (wantsQueue && selectedWorker.queuedTaskCount > 0) {
      setMessage("This worker already has one queued task in reserve. Please select another worker.");
      setIsError(true);
      return;
    }
    setBusy(true);
    try {
      const created = await api<CreatedTask>("/supervisor/tasks", {
        method: "POST",
        body: JSON.stringify({ workerId, assignmentMode: mode, priority, complaintIds: [selected.id] }),
      });
      const delay =
        mode === "QUEUE_2_HOURS"
          ? "in approx. 2 hours"
          : mode === "QUEUE_3_HOURS"
          ? "in approx. 3 hours"
          : "immediately";
      setMessage(
        created.status === "ASSIGNED"
          ? `Task successfully assigned to ${created.assignedWorkerName ?? selectedWorker.fullName}.`
          : `Task successfully queued for ${created.queuedWorkerName ?? selectedWorker.fullName}; will be dispatched ${delay} when a worker becomes free.`
      );
      setIsError(false);
      setSelected(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task allocation failed.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function reviewResolution(taskId: string, accepted: boolean) {
    setReviewingTaskId(taskId);
    try {
      await api(`/supervisor/tasks/${taskId}/resolution-review`, {
        method: "POST",
        body: JSON.stringify({ accepted }),
      });
      setMessage(
        accepted
          ? "Cleanup evidence verified and approved. The citizen complaint ticket is now closed!"
          : "Rework requested. The task has been returned to the worker with status REWORK_REQUIRED."
      );
      setIsError(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review this cleanup.");
      setIsError(true);
    } finally {
      setReviewingTaskId(null);
    }
  }

  return (
    <RequireRole role="SUPERVISOR">
      <main className="app-shell max-w-6xl space-y-8">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                <span>Municipal Supervision Workspace</span>
              </p>
              <h1 className="page-title">Verification & Allocation Hub</h1>
              <p className="page-subtitle">
                Triage incoming citizen reports, verify hot-spot validity, assign field tasks to available sanitation workers, and review photographic proof of cleanup.
              </p>
            </div>
            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-900 shadow-xs">
                {verificationItems.length} To Verify
              </span>
              <span className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-900 shadow-xs">
                {readyItems.length} Ready To Assign
              </span>
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-900 shadow-xs">
                {freeWorkers.length} Free Workers
              </span>
            </div>
          </div>
        </div>

        {/* Global Alert Notification */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium transition-all animate-fade-in ${
              isError
                ? "border border-red-200 bg-red-50 text-red-900 shadow-xs"
                : "border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-xs"
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

        {/* Main Two-Column Triage Section */}
        <div className="grid gap-6 lg:grid-cols-[1fr_390px] items-start">
          {/* Left Column: Queues (Step 1 and Step 2) */}
          <div className="space-y-6">
            {/* Step 1: Pending Verification */}
            <section className="card space-y-4 border-slate-200/90 shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="eyebrow text-amber-700">Step 1 — Triage</p>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Pending Verification Queue</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                  {verificationItems.length} Pending
                </span>
              </div>

              <div className="space-y-3">
                {verificationItems.map(c => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3"
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
                          <span className="text-[11px] font-medium text-slate-400">AI Severity:</span>
                          <StatusBadge value={c.severity} />
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {c.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        className="btn-secondary text-xs sm:text-sm py-2 px-3 inline-flex items-center gap-1.5"
                        onClick={() => setDetailComplaintId(c.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span>Inspect Report</span>
                      </button>

                      <button
                        type="button"
                        className="btn-primary text-xs sm:text-sm py-2 px-3 inline-flex items-center gap-1.5"
                        onClick={() => review(c.id, "APPROVE")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve & Dispatch</span>
                      </button>

                      <button
                        type="button"
                        className="btn-secondary text-xs sm:text-sm py-2 px-3 inline-flex items-center gap-1.5 text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
                        onClick={() => review(c.id, "REJECT")}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </article>
                ))}

                {verificationItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Triage queue is empty</p>
                    <p className="text-xs text-slate-400 mt-0.5">All incoming citizen reports have been verified.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Verified Reports Awaiting Allocation */}
            <section className="card space-y-4 border-slate-200/90 shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="eyebrow text-blue-700">Step 2 — Allocation Pool</p>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">Verified Reports Awaiting Allocation</h2>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                  {readyItems.length} Ready
                </span>
              </div>

              <div className="space-y-3">
                {readyItems.map(c => {
                  const dateObj = new Date(c.createdAt);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : c.createdAt;

                  return (
                    <article
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      key={c.id}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-400">#{c.id.slice(0, 8)}</span>
                          <p className="text-sm font-semibold text-slate-900">{c.description}</p>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Verified: {formattedDate}</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
                          onClick={() => setDetailComplaintId(c.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5 font-bold"
                          onClick={() => openAssignment(c)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Allocate Worker</span>
                        </button>
                      </div>
                    </article>
                  );
                })}

                {readyItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-700">No reports waiting in allocation pool</p>
                    <p className="text-xs text-slate-400 mt-0.5">Approved reports will populate here until assigned to field workers.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Step 3 Worker Allocation Sidebar */}
          <aside className="card h-fit lg:sticky lg:top-20 border-slate-200/90 shadow-card space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <p className="eyebrow text-emerald-700">Step 3 — Dispatch</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Worker Allocation</h2>
              <p className="text-xs text-slate-500 mt-1">
                Assign an approved report to an available sanitation worker. A 50-metre geofence boundary is generated automatically.
              </p>
            </div>

            {!selected ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No report selected for allocation</p>
                <p className="text-xs text-slate-400 mt-1 leading-5">
                  Approve a report from Step 1 or click &ldquo;Allocate Worker&rdquo; in Step 2 to configure assignment parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Report Card */}
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Selected Ticket</span>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{selected.description}</p>
                  <button
                    type="button"
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 inline-flex items-center gap-1 pt-1"
                    onClick={() => setDetailComplaintId(selected.id)}
                  >
                    <Eye className="h-3 w-3" />
                    <span>View Full Citizen Report</span>
                  </button>
                </div>

                {/* Worker Select */}
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="worker">
                    Select Sanitation Worker
                  </label>
                  <select
                    id="worker"
                    className="field text-xs sm:text-sm"
                    value={workerId}
                    onChange={event => selectWorker(event.target.value)}
                  >
                    <option value="">-- Choose a worker --</option>
                    {workers.map(worker => (
                      <option
                        key={worker.id}
                        value={worker.id}
                        disabled={worker.availability === "BUSY" && (worker.queuedTaskCount > 0 || freeWorkers.length > 0)}
                      >
                        {worker.fullName} — {worker.availability === "FREE" ? "Free Now" : `${worker.activeTaskCount} active task(s)${worker.queuedTaskCount ? " (queue full)" : ""}`}
                      </option>
                    ))}
                  </select>

                  {workers.length === 0 && (
                    <p className="field-help text-red-600">No worker accounts exist. Request the administrator to activate workers.</p>
                  )}
                  {freeWorkers.length > 0 && (
                    <p className="field-help text-emerald-800 font-medium">
                      {freeWorkers.length} free worker{freeWorkers.length === 1 ? " is" : "s are"} available for immediate dispatch.
                    </p>
                  )}
                </div>

                {/* Selected Worker Status Pill */}
                {selectedWorker && (
                  <div
                    className={`rounded-xl p-3 text-xs font-medium border ${
                      selectedWorker.availability === "FREE"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : "bg-amber-50 text-amber-900 border-amber-200"
                    }`}
                  >
                    <strong>{selectedWorker.fullName}</strong> is{" "}
                    {selectedWorker.availability === "FREE"
                      ? "free and ready for immediate on-site assignment."
                      : `busy with ${selectedWorker.activeTaskCount} active task(s). Queueing mode recommended.`}
                  </div>
                )}

                {/* Assignment Mode */}
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="assignmentMode">
                    Assignment Mode
                  </label>
                  <select
                    id="assignmentMode"
                    className="field text-xs sm:text-sm"
                    value={mode}
                    onChange={event => setMode(event.target.value as AssignmentMode)}
                  >
                    <option value="IMMEDIATE" disabled={selectedWorker?.availability !== "FREE"}>
                      Immediate Assignment
                    </option>
                    <option
                      value="QUEUE_2_HOURS"
                      disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}
                    >
                      Queue (Dispatch after 2 hours)
                    </option>
                    <option
                      value="QUEUE_3_HOURS"
                      disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}
                    >
                      Queue (Dispatch after 3 hours)
                    </option>
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="field-label" htmlFor="priority">
                    Operational Priority
                  </label>
                  <select
                    id="priority"
                    className="field text-xs sm:text-sm"
                    value={priority}
                    onChange={event => setPriority(event.target.value)}
                  >
                    {priorityOptions.map(value => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="btn-primary flex-1 py-2.5 text-xs sm:text-sm font-bold shadow-sm"
                    disabled={busy || !selectedWorker}
                    onClick={allocate}
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                      </span>
                    ) : mode === "IMMEDIATE" ? (
                      "Assign Task"
                    ) : (
                      "Queue Task"
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary py-2.5 text-xs sm:text-sm"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Step 4: Final Verification Review Queue */}
        <SupervisorResolutionReview
          tasks={resolutionReviewTasks}
          busyTaskId={reviewingTaskId}
          onReview={reviewResolution}
        />

        {/* Step 5: Queued Work List */}
        <section className="card space-y-4 border-slate-200/90 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="eyebrow text-violet-700">Delayed Assignments</p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Queued Tasks in Waiting State</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800 border border-violet-200">
              {queuedTasks.length} Queued
            </span>
          </div>

          <div className="space-y-2.5">
            {queuedTasks.map(task => {
              const queueObj = task.queuedForAt ? new Date(task.queuedForAt) : null;
              const formattedQueue = queueObj && !isNaN(queueObj.getTime())
                ? queueObj.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs"
                  key={task.id}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-600 shrink-0" />
                    <span>
                      Worker: <strong className="text-slate-900">{task.queuedWorkerName ?? "Worker pending"}</strong> · Priority: <strong>{task.priority}</strong>
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {formattedQueue ? `Eligible from ${formattedQueue}` : "Awaiting worker availability"}
                  </span>
                </div>
              );
            })}

            {queuedTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                <p className="text-xs text-slate-500">No delayed tasks are currently queued.</p>
              </div>
            )}
          </div>
        </section>

        {/* Detail Inspection Modal */}
        <ComplaintDetailDialog
          complaintId={detailComplaintId}
          onClose={() => setDetailComplaintId(null)}
        />
      </main>
    </RequireRole>
  );
}
