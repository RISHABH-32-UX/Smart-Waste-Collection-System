"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { ComplaintDetailDialog } from "../../components/ComplaintDetailDialog";
import { RequireRole } from "../../components/RequireRole";
import { ResolutionTask, SupervisorResolutionReview } from "../../components/SupervisorResolutionReview";
import { StatusBadge } from "../../components/StatusBadge";

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

  return <RequireRole role="SUPERVISOR">
    <main className="app-shell space-y-8">
      <div className="page-header">
        <p className="eyebrow">Supervisor workspace</p>
        <h1 className="page-title">Verification & allocation hub</h1>
        <p className="page-subtitle">Verify a report first, then assign it to a free worker. The system always assigns immediately when anyone is free; queueing is available only when every worker is busy.</p>
      </div>
      {message && <p className={isError ? "alert-error" : "alert-success"}>{message}</p>}

      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="card">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow">Step 1</p><h2 className="mt-1 text-lg font-bold">Pending verification</h2></div><span className="badge bg-amber-50 text-amber-800 ring-amber-600/20">{verificationItems.length} pending</span></div>
            <div className="space-y-3">{verificationItems.map(c => <article className="rounded-lg border border-slate-200 p-4" key={c.id}><div className="flex flex-wrap items-center gap-2">{c.severity && <StatusBadge value={c.severity} />}<StatusBadge value={c.status} /></div><p className="mt-3 font-medium text-slate-900">{c.description}</p><p className="mt-2 text-xs text-slate-500">{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)} · AI severity: {c.severity ?? "pending"}</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setDetailComplaintId(c.id)}>View report</button><button className="btn-primary" onClick={() => review(c.id, "APPROVE")}>Approve & assign</button><button className="btn-secondary" onClick={() => review(c.id, "REJECT")}>Reject</button></div></article>)}{verificationItems.length === 0 && <p className="empty-state">No reports need verification.</p>}</div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Step 2</p><h2 className="mt-1 text-lg font-bold">Verified reports awaiting allocation</h2></div><span className="badge bg-blue-50 text-blue-800 ring-blue-600/20">{readyItems.length} ready</span></div>
            <div className="space-y-3">{readyItems.map(c => <article className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between" key={c.id}><div><p className="font-medium">{c.description}</p><p className="mt-1 text-xs text-slate-500">Verified {new Date(c.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button className="btn-secondary" onClick={() => setDetailComplaintId(c.id)}>View report</button><button className="btn-primary" onClick={() => openAssignment(c)}>Allocate worker</button></div></article>)}{readyItems.length === 0 && <p className="empty-state">Approved reports will appear here until a task is allocated.</p>}</div>
          </div>
        </div>

        <aside className="card h-fit lg:sticky lg:top-6">
          <p className="eyebrow">Step 3</p><h2 className="mt-1 text-lg font-bold">Worker allocation</h2>
          {!selected ? <p className="mt-4 text-sm leading-6 text-slate-600">Approve a report or choose one from the verified list to assign a worker. A 50 metre geofence is created automatically around the report location.</p> : <div className="mt-4 space-y-4"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected report</p><p className="mt-1 text-sm font-medium">{selected.description}</p><button className="mt-3 text-sm font-semibold text-emerald-700 underline underline-offset-2" onClick={() => setDetailComplaintId(selected.id)}>View full citizen report</button></div><div><label className="field-label" htmlFor="worker">Worker</label><select id="worker" className="field" value={workerId} onChange={event => selectWorker(event.target.value)}><option value="">Select a worker</option>{workers.map(worker => <option key={worker.id} value={worker.id} disabled={worker.availability === "BUSY" && (worker.queuedTaskCount > 0 || freeWorkers.length > 0)}>{worker.fullName} — {worker.availability === "FREE" ? "Free now" : `${worker.activeTaskCount} active task${worker.activeTaskCount === 1 ? "" : "s"}${worker.queuedTaskCount ? `, ${worker.queuedTaskCount} queued task${worker.queuedTaskCount === 1 ? "" : "s"}` : ""}`}</option>)}</select>{workers.length === 0 && <p className="field-help text-red-700">No active worker accounts exist. Ask an admin to create or activate a worker.</p>}{freeWorkers.length > 0 && <p className="field-help text-emerald-800">{freeWorkers.length} free worker{freeWorkers.length === 1 ? " is" : "s are"} available, so this task will be assigned immediately.</p>}</div>{selectedWorker && <div className={`rounded-lg p-3 text-sm ${selectedWorker.availability === "FREE" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><strong>{selectedWorker.fullName}</strong> is {selectedWorker.availability === "FREE" ? "free and can receive this task now." : `busy with ${selectedWorker.activeTaskCount} active task(s).`}</div>}<div><label className="field-label" htmlFor="assignmentMode">Assignment</label><select id="assignmentMode" className="field" value={mode} onChange={event => setMode(event.target.value as AssignmentMode)}><option value="IMMEDIATE" disabled={selectedWorker?.availability !== "FREE"}>Assign immediately</option><option value="QUEUE_2_HOURS" disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}>Queue after 2 hours</option><option value="QUEUE_3_HOURS" disabled={freeWorkers.length > 0 || selectedWorker?.availability !== "BUSY" || selectedWorker?.queuedTaskCount > 0}>Queue after 3 hours</option></select><p className="field-help">When a free worker exists, the task is assigned immediately. Otherwise queued work is assigned after the selected delay when any worker becomes free.</p></div><div><label className="field-label" htmlFor="priority">Priority</label><select id="priority" className="field" value={priority} onChange={event => setPriority(event.target.value)}>{priorityOptions.map(value => <option key={value}>{value}</option>)}</select></div><div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy || !selectedWorker} onClick={allocate}>{busy ? "Saving…" : mode === "IMMEDIATE" ? "Assign task" : "Queue task"}</button><button className="btn-secondary" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div></div>}
        </aside>
      </section>

      <SupervisorResolutionReview tasks={resolutionReviewTasks} busyTaskId={reviewingTaskId} onReview={reviewResolution} />

      <section className="card"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Delayed assignments</p><h2 className="mt-1 text-lg font-bold">Queued work</h2></div><span className="badge bg-violet-50 text-violet-800 ring-violet-600/20">{queuedTasks.length} queued</span></div><div className="space-y-2">{queuedTasks.map(task => <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={task.id}><span><strong>{task.queuedWorkerName ?? "Worker pending"}</strong> · {task.priority} priority</span><span className="text-slate-500">{task.queuedForAt ? `Eligible in ${countdowns[task.id] ?? getCountdown(task.queuedForAt)} (${new Date(task.queuedForAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : "Awaiting reassignment"}</span></div>)}{queuedTasks.length === 0 && <p className="empty-state">No delayed tasks are queued.</p>}</div></section>
      <ComplaintDetailDialog complaintId={detailComplaintId} onClose={() => setDetailComplaintId(null)} />
    </main>
  </RequireRole>;
}
