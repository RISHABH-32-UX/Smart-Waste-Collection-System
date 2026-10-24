"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
type Task = { id: string; status: string; priority: string; dueAt?: string; boundaryGeoJson: string };

export default function WorkerPage() {
  const [tasks, setTasks] = useState<Task[]>([]); const [message, setMessage] = useState(""); const [isError, setIsError] = useState(false);
  async function refresh() { try { setTasks(await api<Task[]>("/worker/tasks")); } catch { setMessage("Sign in with a worker account to view tasks."); setIsError(true); } }
  useEffect(() => { refresh(); }, []);
  async function sendLocation(taskId: string) {
    navigator.geolocation.getCurrentPosition(async p => {
      try {
        const result = await api<{ insideGeofence: boolean; entryConfirmed: boolean; taskStatus: string }>(`/worker/tasks/${taskId}/location-events`, {
          method: "POST", body: JSON.stringify({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracyMeters: p.coords.accuracy, capturedAt: new Date(p.timestamp).toISOString() }),
        });
        setMessage(result.entryConfirmed ? "On-site check-in confirmed." : result.insideGeofence ? "Inside site: send one more accurate GPS point to confirm." : "You are outside the assigned geofence.");
        setIsError(!result.entryConfirmed); refresh();
      } catch (e) { setMessage(e instanceof Error ? e.message : "Location check failed"); setIsError(true); }
    }, () => { setMessage("Location permission is required."); setIsError(true); }, { enableHighAccuracy: true, timeout: 15000 });
  }
  return <RequireRole role="WORKER">
    <main className="app-shell max-w-5xl">
      <div className="page-header">
      <p className="eyebrow">Field operations</p>
      <h1 className="page-title">Assigned collection tasks</h1>
      <p className="page-subtitle">Tasks are ordered by priority and due time. Check in only at the collection site.</p>
      </div>
      {message && <p className={`mb-4 ${isError ? "alert-error" : "alert-success"}`}>{message}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map(t => (
          <article className="card" key={t.id}>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge value={t.priority} />
              <StatusBadge value={t.status} />
            </div>
            <p className="mt-3 text-sm text-slate-700">Due: {t.dueAt ? new Date(t.dueAt).toLocaleString() : "Not set"}</p>
            <button className="btn-secondary mt-4" onClick={() => sendLocation(t.id)}>📍 Verify my location</button>
          </article>
        ))}
        {tasks.length === 0 && <p className="empty-state md:col-span-2">No tasks are assigned to you yet.</p>}
      </div>
    </main>
  </RequireRole>;
}
