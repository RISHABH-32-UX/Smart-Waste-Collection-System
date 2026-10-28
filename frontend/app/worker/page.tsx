"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { WorkerTaskWorkspace } from "../../components/WorkerTaskWorkspace";

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
        </article>)}
        {tasks.length === 0 && <p className="empty-state md:col-span-2">No tasks are assigned to you yet.</p>}
      </div>}
    </main>
  </RequireRole>;
}
