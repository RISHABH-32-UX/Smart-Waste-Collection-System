"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { RequireRole } from "../../components/RequireRole";
import { StatusBadge } from "../../components/StatusBadge";
import { CameraCapture } from "../../components/CameraCapture";

type Complaint = { id: string; status: string; description: string; severity?: string; createdAt: string };
function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), reject,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
}

export default function ReportPage() {
  const [file, setFile] = useState<File | null>(null), [description, setDescription] = useState("");
  const [message, setMessage] = useState(""), [isError, setIsError] = useState(false), [history, setHistory] = useState<Complaint[]>([]), [busy, setBusy] = useState(false);
  async function refresh() { try { setHistory(await api<Complaint[]>("/complaints")); } catch { /* User may not be signed in yet. */ } }
  useEffect(() => { refresh(); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setMessage("Add a site photo first."); setIsError(true); return; }
    setBusy(true);
    try {
      setMessage("Getting secure location and uploading photo…"); setIsError(false);
      const form = new FormData(); form.append("file", file);
      const upload = await api<{ assetId: string }>("/uploads", { method: "POST", body: form });
      const location = await locate();
      await api("/complaints", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ description, location, beforeAssetIds: [upload.assetId] }) });
      setDescription(""); setFile(null); setMessage("Complaint submitted for verification."); setIsError(false); refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Submission failed"); setIsError(true); }
    finally { setBusy(false); }
  }
  return <RequireRole role="CITIZEN">
    <main className="app-shell grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="card self-start">
        <p className="eyebrow">New report</p>
        <h1 className="page-title mb-5 mt-2">Help keep your area clean</h1>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <p className="field-label">Site photo</p>
            <CameraCapture disabled={busy} onCapture={setFile} />
            {file && <p className="mt-2 text-sm font-medium text-emerald-800">Photo ready: {file.name}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="description">Description</label>
            <textarea id="description" className="field min-h-24" placeholder="Describe the waste, size, and nearby landmark" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Submitting…" : "Submit complaint"}</button>
        </form>
        {message && <p className={`mt-4 ${isError ? "alert-error" : "alert-success"}`}>{message}</p>}
      </section>
      <section>
        <p className="eyebrow">Tracking</p>
        <h2 className="page-title mb-4 mt-2">My reports</h2>
        <div className="space-y-3">
          {history.map(c => (
            <article className="card-compact" key={c.id}>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge value={c.status} />
                {c.severity && <StatusBadge value={c.severity} />}
              </div>
              <p className="mt-2 text-sm text-slate-700">{c.description}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
            </article>
          ))}
          {history.length === 0 && <p className="empty-state">No reports yet. Your submissions will appear here with their current status.</p>}
        </div>
      </section>
    </main>
  </RequireRole>;
}
