"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { ComplaintDetailDialog } from "../../components/ComplaintDetailDialog";
import { RequireRole } from "../../components/RequireRole";
import { ResolutionTask, SupervisorResolutionReview } from "../../components/SupervisorResolutionReview";
import { StatusBadge } from "../../components/StatusBadge";
import { Eye, Check, X, Truck, RefreshCw } from "lucide-react";

type Complaint = { id: string; status: string; description: string; severity?: string; latitude: number; longitude: number; createdAt: string };
type Worker = { id: string; fullName: string; email: string; availability: "FREE" | "BUSY"; activeTaskCount: number; queuedTaskCount: number };
type QueueTask = { id: string; status: string; priority: string; queuedForAt?: string; queuedWorkerName?: string };
type CreatedTask = { id: string; status: string; assignedWorkerName?: string; queuedWorkerName?: string };
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

  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      queuedTasks.forEach(task => {
        if (task.queuedForAt) {
          newCountdowns[task.id] = getCountdown(task.queuedForAt);
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [queuedTasks]);

  const selectedWorker = useMemo(() => workers.find(worker => worker.id === workerId), [workers, workerId]);
  const freeWorkers = useMemo(() => workers.filter(worker => worker.availability === "FREE"), [workers]);

  async function refresh() {
    try {
      const [verification, ready, availability, queue, resolutions] = await Promise.all([
        api<Complaint[]>("/supervisor/verification-queue"),
        api<Complaint[]>("/supervisor/assignment-ready"),
        api<Worker[]>("/supervisor/workers/availability"),
        api<QueueTask[]>("/supervisor/tasks/assignment-queue"),
        api<ResolutionTask[]>("/supervisor/tasks/resolution-review-queue"),
      ]);
      setVerificationItems(verification); setReadyItems(ready); setWorkers(availability); setQueuedTasks(queue); setResolutionReviewTasks(resolutions);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the supervisor workspace."); setIsError(true);
    }
  }

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 30_000); return () => window.clearInterval(timer); }, []);

  async function review(id: string, decision: "APPROVE" | "REJECT") {
    try {
      const complaint = await api<Complaint>(`/supervisor/complaints/${id}/verification`, {
        method: "POST", body: JSON.stringify({ decision, severity: "MEDIUM" }),
      });
      setMessage(decision === "APPROVE" ? "Complaint verified. Select a worker to allocate the cleanup task." : "Complaint rejected.");
      setIsError(false);
      if (decision === "APPROVE") openAssignment(complaint); else await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review failed."); setIsError(true); }
  }

  function openAssignment(complaint: Complaint) {
    setSelected(complaint);
    const firstFree = workers.find(worker => worker.availability === "FREE");
    const firstBusy = workers.find(worker => worker.availability === "BUSY" && worker.queuedTaskCount === 0);
    setWorkerId(firstFree?.id ?? firstBusy?.id ?? "");
    setMode(firstFree ? "IMMEDIATE" : "QUEUE_2_HOURS");
    setPriority("MEDIUM");
  }

  function selectWorker(value: string) {
    setWorkerId(value);
    const worker = workers.find(item => item.id === value);
    if (freeWorkers.length > 0 && worker?.availability === "BUSY") {
      setWorkerId(freeWorkers[0].id); setMode("IMMEDIATE"); return;
    }
    if (worker?.availability === "FREE") setMode("IMMEDIATE");
    else if (worker) {
      if (worker.queuedTaskCount > 0) {
        setMode("QUEUE_3_HOURS");
      } else {
        setMode("QUEUE_2_HOURS");
      }
    }
  }

  async function allocate() {
    if (!selected || !selectedWorker) return;
    const wantsQueue = mode !== "IMMEDIATE";
    if (freeWorkers.length > 0 && selectedWorker.availability !== "FREE") {
      setMessage("A free worker is available. Select a free worker for immediate assignment."); setIsError(true); return;
    }
    if (!wantsQueue && selectedWorker.availability !== "FREE") {
      setMessage("This worker is busy. Queue the task for two or three hours, or choose a free worker."); setIsError(true); return;
    }
    if (wantsQueue && selectedWorker.availability !== "BUSY") {
      setMessage("Queueing is only for a currently busy worker. Choose immediate assignment instead."); setIsError(true); return;
    }
    if (wantsQueue && selectedWorker.queuedTaskCount > 0) {
      setMessage("This worker already has one queued task. Choose a different busy worker."); setIsError(true); return;
    }
    setBusy(true);
    try {
      const created = await api<CreatedTask>("/supervisor/tasks", {
        method: "POST",
        body: JSON.stringify({ workerId, assignmentMode: mode, priority, complaintIds: [selected.id] }),
      });
      const delay = mode === "QUEUE_2_HOURS" ? "in about 2 hours" : mode === "QUEUE_3_HOURS" ? "in about 3 hours" : "immediately";
      setMessage(created.status === "ASSIGNED" ? `Task assigned to ${created.assignedWorkerName ?? selectedWorker.fullName}.` : `Task queued for ${created.queuedWorkerName ?? selectedWorker.fullName}; it will be assigned ${delay} when a worker is free.`);
      setIsError(false); setSelected(null); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Task allocation failed."); setIsError(true); }
    finally { setBusy(false); }
  }

  async function reviewResolution(taskId: string, accepted: boolean) {
    setReviewingTaskId(taskId);
    try {
      await api(`/supervisor/tasks/${taskId}/resolution-review`, { method: "POST", body: JSON.stringify({ accepted }) });
      setMessage(accepted ? "Cleanup evidence verified. The complaint is now closed." : "Rework requested. The task has been returned to the assigned worker.");
      setIsError(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review this cleanup."); setIsError(true);
    } finally { setReviewingTaskId(null); }
  }

  return (
    <RequireRole role="SUPERVISOR">
      <main className="app-shell space-y-8">
        {/* Header */}
        <div className="page-header flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Municipal Operations Center</p>
            <h1 className="page-title">Verification & Allocation Hub</h1>
            <p className="page-subtitle">Verify citizen reports, assign nearby workers, and monitor geofenced collection tasks in real time.</p>
          </div>
          <button onClick={refresh} className="btn-secondary self-start md:self-auto text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Roster & Queues</span>
          </button>
        </div>

        {message && (
          <div className={isError ? "alert-error" : "alert-success"}>
            <p className="font-semibold text-xs">{isError ? "Notice" : "Success"}</p>
            <p className="mt-0.5 text-xs">{message}</p>
          </div>
        )}

        {/* Quick Operational Telemetry Summary */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Triage</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{verificationItems.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Step 1 verification</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ready to Dispatch</p>
            <p className="mt-1 text-2xl font-black text-blue-700">{readyItems.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Step 2 allocation</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Workers Active</p>
            <p className="mt-1 text-2xl font-black text-brand-700">{workers.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">{freeWorkers.length} free right now</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Queued Delays</p>
            <p className="mt-1 text-2xl font-black text-violet-700">{queuedTasks.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Scheduled SLA timers</p>
          </div>
        </section>

        {/* Verification & Allocation Layout */}
        <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            {/* Step 1: Pending Verification */}
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="eyebrow">Stage 1</span>
                  <h2 className="text-base font-extrabold text-slate-900">Pending Verification Queue</h2>
                </div>
                <span className="badge bg-amber-50 text-amber-800 ring-amber-600/20 font-bold">
                  {verificationItems.length} awaiting
                </span>
              </div>

              <div className="space-y-3">
                {verificationItems.map(c => (
                  <article className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-brand-300" key={c.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {c.severity && <StatusBadge value={c.severity} />}
                        <StatusBadge value={c.status} />
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        GPS: {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{c.description}</p>
                    <p className="mt-1 text-xs text-slate-500">AI triage confidence: <span className="font-semibold text-slate-700">{c.severity ?? "Pending evaluation"}</span></p>
                    <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <button className="btn-secondary btn-sm inline-flex items-center gap-1.5" onClick={() => setDetailComplaintId(c.id)}>
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Evidence</span>
                      </button>
                      <button className="btn-primary btn-sm inline-flex items-center gap-1.5" onClick={() => review(c.id, "APPROVE")}>
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Dispatch</span>
                      </button>
                      <button className="btn-secondary btn-sm text-red-700 hover:bg-red-50 hover:border-red-200 inline-flex items-center gap-1.5" onClick={() => review(c.id, "REJECT")}>
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </article>
                ))}
                {verificationItems.length === 0 && (
                  <div className="empty-state p-8">
                    <p className="font-bold text-slate-800">Verification Queue Clear</p>
                    <p className="mt-1 text-xs text-slate-500">No citizen complaints currently require supervisor verification.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Verified Reports Awaiting Allocation */}
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="eyebrow">Stage 2</span>
                  <h2 className="text-base font-extrabold text-slate-900">Verified Reports Awaiting Allocation</h2>
                </div>
                <span className="badge bg-blue-50 text-blue-800 ring-blue-600/20 font-bold">
                  {readyItems.length} ready
                </span>
              </div>

              <div className="space-y-3">
                {readyItems.map(c => (
                  <article className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" key={c.id}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.description}</p>
                      <p className="mt-1 text-xs text-slate-400">Verified at {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button className="btn-secondary btn-sm" onClick={() => setDetailComplaintId(c.id)}>
                        Details
                      </button>
                      <button className="btn-primary btn-sm" onClick={() => openAssignment(c)}>
                        Allocate Worker →
                      </button>
                    </div>
                  </article>
                ))}
                {readyItems.length === 0 && (
                  <div className="empty-state p-8">
                    <p className="font-bold text-slate-800">No Verified Reports Pending Allocation</p>
                    <p className="mt-1 text-xs text-slate-500">Approved complaints will appear here immediately for worker dispatch.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Worker Allocation Sidebar */}
          <aside className="card h-fit p-5 lg:sticky lg:top-20">
            <span className="eyebrow">Stage 3</span>
            <h2 className="mt-1 text-base font-extrabold text-slate-900">Task Dispatch & Geofence</h2>
            
            {!selected ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
                <Truck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="mt-2 font-bold text-slate-800">No report selected</p>
                <p className="mt-1 leading-relaxed text-slate-500">Select "Allocate worker" on any verified report. A 50-metre municipal geofence is created automatically.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Incident</span>
                  <p className="mt-1 text-xs font-bold text-slate-900 leading-snug">{selected.description}</p>
                  <button className="mt-2 text-xs font-semibold text-brand-700 underline underline-offset-2" onClick={() => setDetailComplaintId(selected.id)}>
                    View full report evidence
                  </button>
                </div>

                <div>
                  <label className="field-label" htmlFor="worker">Assign Municipal Worker</label>
                  <select id="worker" className="field text-xs min-h-10" value={workerId} onChange={event => selectWorker(event.target.value)}>
                    <option value="">Select a worker</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id} disabled={worker.availability === "BUSY" && (worker.queuedTaskCount > 0 || freeWorkers.length > 0)}>
                        {worker.fullName} — {worker.availability === "FREE" ? "Free now" : `${worker.activeTaskCount} active task${worker.activeTaskCount === 1 ? "" : "s"}${worker.queuedTaskCount ? `, ${worker.queuedTaskCount} queued` : ""}`}
                      </option>
                    ))}
                  </select>
                  {workers.length === 0 && <p className="field-help text-red-700">No active worker accounts exist.</p>}
                  {freeWorkers.length > 0 && <p className="field-help text-emerald-800">{freeWorkers.length} free worker{freeWorkers.length === 1 ? " is" : "s are"} available for immediate dispatch.</p>}
                </div>

                {selectedWorker && (
                  <div className={`rounded-xl p-3 text-xs leading-5 ${selectedWorker.availability === "FREE" ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
                    <strong>{selectedWorker.fullName}</strong> is {selectedWorker.availability === "FREE" ? "available and ready for immediate dispatch." : `currently handling ${selectedWorker.activeTaskCount} active task(s).`}
                  </div>
                )}

                <div>
                  <label className="field-label" htmlFor="assignmentMode">Dispatch Mode</label>
                  <select id="assignmentMode" className="field text-xs min-h-10" value={mode} onChange={event => setMode(event.target.value as AssignmentMode)}>
                    <option value="IMMEDIATE" disabled={selectedWorker?.availability !== "FREE"}>Assign immediately</option>
                    <option value="QUEUE_2_HOURS" disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}>Queue after 2 hours</option>
                    <option value="QUEUE_3_HOURS" disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}>Queue after 3 hours</option>
                  </select>
                </div>

                <div>
                  <label className="field-label" htmlFor="priority">Incident Priority</label>
                  <select id="priority" className="field text-xs min-h-10" value={priority} onChange={event => setPriority(event.target.value)}>
                    {priorityOptions.map(value => <option key={value}>{value}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="btn-primary flex-1 text-xs" disabled={busy || !selectedWorker} onClick={allocate}>
                    {busy ? "Saving…" : mode === "IMMEDIATE" ? "Dispatch Task →" : "Queue Task →"}
                  </button>
                  <button className="btn-secondary btn-sm" disabled={busy} onClick={() => setSelected(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>

        {/* Final Cleanup Resolution Review Section */}
        <SupervisorResolutionReview tasks={resolutionReviewTasks} busyTaskId={reviewingTaskId} onReview={reviewResolution} />

        {/* Queued Work with Real-time Countdowns */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="eyebrow">Scheduled Pipeline</span>
              <h2 className="text-base font-extrabold text-slate-900">Queued Delayed Tasks</h2>
            </div>
            <span className="badge bg-violet-50 text-violet-800 ring-violet-600/20 font-bold">
              {queuedTasks.length} queued
            </span>
          </div>

          <div className="space-y-2">
            {queuedTasks.map(task => (
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between" key={task.id}>
                <div>
                  <span className="font-bold text-slate-900">{task.queuedWorkerName ?? "Pending worker allocation"}</span>
                  <span className="ml-2 font-mono text-[10px] text-slate-500">[{task.priority} Priority]</span>
                </div>
                <div className="font-medium text-slate-600">
                  {task.queuedForAt ? `Eligible in ${countdowns[task.id] ?? getCountdown(task.queuedForAt)} (${new Date(task.queuedForAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : "Awaiting reassignment"}
                </div>
              </div>
            ))}
            {queuedTasks.length === 0 && (
              <div className="empty-state p-6">
                <p className="text-xs text-slate-500">No delayed tasks currently waiting in the assignment queue.</p>
              </div>
            )}
          </div>
        </section>

        <ComplaintDetailDialog complaintId={detailComplaintId} onClose={() => setDetailComplaintId(null)} />
      </main>
    </RequireRole>
  );
}
