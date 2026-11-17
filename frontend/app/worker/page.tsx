"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { WorkerTaskWorkspace } from "../../components/WorkerTaskWorkspace";
import { Map, Check, Truck, RefreshCw } from "lucide-react";

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

  useEffect(() => { refresh(); }, []);

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

  return (
    <RequireRole role="WORKER">
      <main className="app-shell max-w-6xl space-y-6">
        <div className="page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Municipal Field Unit</span>
            <h1 className="page-title">Assigned Collection Tasks</h1>
            <p className="page-subtitle">Inspect assigned complaint sites, navigate via geofence map, and upload photographic resolution evidence.</p>
          </div>
          <button onClick={refresh} className="btn-secondary self-start sm:self-auto text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Tasks</span>
          </button>
        </div>

        {message && (
          <div className={isError ? "alert-error" : "alert-success"}>
            <p className="font-semibold text-xs">{isError ? "Notice" : "Status Update"}</p>
            <p className="mt-0.5 text-xs">{message}</p>
          </div>
        )}

        {selectedTaskId ? (
          <WorkerTaskWorkspace
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onResolutionSubmitted={refresh}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {tasks.map(task => (
              <article
                className={`card flex flex-col justify-between transition hover:border-brand-300 ${
                  task.priority === "CRITICAL" || task.priority === "HIGH" ? "border-l-4 border-l-red-500" : ""
                }`}
                key={task.id}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{task.id.slice(0, 8)}
                    </span>
                  </div>

                  {task.status === "QUEUED" && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-xs font-bold text-amber-900 border border-amber-200">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Available in: {countdowns[task.id] || "Calculating…"}</span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Target Resolution Due:</span>
                    <span className="font-semibold text-slate-800">
                      {task.dueAt ? new Date(task.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Immediate"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    className="btn-primary btn-sm flex-1 inline-flex items-center justify-center gap-1.5"
                    disabled={task.status === "QUEUED"}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Open Workspace & Map</span>
                  </button>
                  {(["ASSIGNED", "ACCEPTED"] as string[]).includes(task.status) && (
                    <button
                      className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                      disabled={busyTaskId === task.id}
                      onClick={() => proceedToTask(task.id)}
                    >
                      {busyTaskId === task.id ? (
                        "Verifying GPS…"
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm On-Site</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            ))}

            {tasks.length === 0 && (
              <div className="empty-state md:col-span-2 p-12">
                <Truck className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="mt-3 text-base font-bold text-slate-900">No field tasks assigned</p>
                <p className="mt-1 text-xs text-slate-500">When municipal supervisors dispatch verified waste clusters to you, they will appear here with site maps.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </RequireRole>
  );
}
