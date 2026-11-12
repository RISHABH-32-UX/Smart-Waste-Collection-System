"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { WorkerTaskWorkspace } from "../../components/WorkerTaskWorkspace";
import {
  HardHat,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Navigation,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

type Task = { id: string; status: string; priority: string; dueAt?: string; queuedForAt?: string };

export default function WorkerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      tasks.forEach(task => {
        if (task.queuedForAt && task.status === "QUEUED") {
          const diff = new Date(task.queuedForAt).getTime() - Date.now();
          if (diff <= 0) {
            newCountdowns[task.id] = "Activating now...";
            refresh();
          } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            newCountdowns[task.id] = `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
          }
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  async function refresh() {
    try {
      setTasks(await api<Task[]>("/worker/tasks"));
      setIsError(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Sign in with a worker account to view tasks.");
      setIsError(true);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function proceedToTask(taskId: string) {
    setBusyTaskId(taskId);
    setMessage("");
    try {
      await api(`/worker/tasks/${taskId}/arrive`, { method: "POST" });
      setMessage("Arrived on-site! You can now view the task and upload your cleanup proof.");
      setIsError(false);
      await refresh();
      setSelectedTaskId(taskId);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Failed to proceed to task.");
      setIsError(true);
    } finally {
      setBusyTaskId(null);
    }
  }

  return <RequireRole role="WORKER">
    <main className="app-shell max-w-6xl">
      <div className="page-header">
        <p className="eyebrow">Field operations</p>
        <h1 className="page-title">Assigned collection tasks</h1>
        <p className="page-subtitle">Open a task to view the citizen report, its photos, and the assigned map location. Click 'Proceed to Task' once you reach the site to submit proof of cleanup.</p>
      </div>
      {message && <p className={`mb-4 ${isError ? "alert-error" : "alert-success"}`}>{message}</p>}

      {selectedTaskId ? <WorkerTaskWorkspace taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onResolutionSubmitted={refresh} /> : <div className="grid gap-4 md:grid-cols-2">
        {tasks.map(task => <article className="card" key={task.id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div>
          {task.status === "QUEUED" && <p className="mt-2 text-sm font-bold text-emerald-800">Available in: {countdowns[task.id] || "..."}</p>}
          <p className="mt-3 text-sm text-slate-700">Due: {task.dueAt ? new Date(task.dueAt).toLocaleString() : "Not set"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={task.status === "QUEUED"} onClick={() => setSelectedTaskId(task.id)}>View task & map</button>
            {(["ASSIGNED", "ACCEPTED"] as string[]).includes(task.status) && (
              <button
                className="btn-secondary"
                disabled={busyTaskId === task.id}
                onClick={() => proceedToTask(task.id)}
              >
                {busyTaskId === task.id ? "Updating..." : "✅ Reached Destination / Proceed to Task"}
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium transition-all animate-fade-in ${
              isError
                ? "border border-red-200 bg-red-50/90 text-red-900 shadow-xs"
                : "border border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-xs"
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

        {/* Active Task Workspace (when opened) or Task Cards Grid */}
        {selectedTaskId ? (
          <WorkerTaskWorkspace
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onResolutionSubmitted={refresh}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tasks.map(task => {
              const hasDueDate = Boolean(task.dueAt);
              const dueObj = task.dueAt ? new Date(task.dueAt) : null;
              const formattedDue = dueObj && !isNaN(dueObj.getTime())
                ? dueObj.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not scheduled";

              const canVerifyLocation = (["ASSIGNED", "ACCEPTED", "ON_SITE"] as string[]).includes(task.status);
              const isVerifyingThis = gpsLoadingTaskId === task.id;

              return (
                <article
                  className="card hover:-translate-y-0.5 transition-all duration-150 border-slate-200/90 shadow-card flex flex-col justify-between"
                  key={task.id}
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          #{task.id.slice(0, 8)}
                        </span>
                        <StatusBadge value={task.status} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400">Priority:</span>
                        <StatusBadge value={task.priority} />
                      </div>
                    </div>

                    {/* Task Timeline / Due Date */}
                    <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>
                        Deadline: <strong className="text-slate-800 font-semibold">{formattedDue}</strong>
                      </span>
                    </div>

                    {/* Geofence notice */}
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 text-xs text-slate-600">
                      <Navigation className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>50-metre boundary geofence active for GPS on-site validation</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      className="btn-primary inline-flex items-center gap-1.5 text-xs sm:text-sm flex-1 sm:flex-initial"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Task & Map</span>
                    </button>

                    {canVerifyLocation && (
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-800 hover:text-emerald-900 border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70"
                        disabled={isVerifyingThis}
                        onClick={() => sendLocation(task.id)}
                      >
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        <span>{isVerifyingThis ? "Checking GPS…" : "Verify Location"}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {tasks.length === 0 && (
              <div className="card md:col-span-2 rounded-2xl border-dashed border-2 border-slate-200 bg-slate-50/50 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs mb-3">
                  <CheckCircle2 className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No collection tasks currently assigned</h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                  You are all caught up! When supervisors triage citizen waste reports and allocate collection work to you, your task tickets will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </RequireRole>
  );
}