"use client";

import { useEffect, useState } from "react";
import { api, authorizedBlob } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

type ComplaintDetail = {
  complaint: {
    id: string;
    status: string;
    description: string;
    severity?: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    updatedAt: string;
  };
  reporter: { fullName: string; email: string; phone?: string };
  media: Array<{ id: string; filename: string; contentType: string; sizeBytes: number; kind: string }>;
};

type Props = { complaintId: string | null; onClose: () => void };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComplaintDetailDialog({ complaintId, onClose }: Props) {
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!complaintId) {
      setDetail(null);
      setImageUrls({});
      setError("");
      return;
    }

    let active = true;
    const allocatedUrls: string[] = [];
    setLoading(true);
    setDetail(null);
    setImageUrls({});
    setError("");

    async function load() {
      try {
        const report = await api<ComplaintDetail>(`/supervisor/complaints/${complaintId}`);
        const loadedImages = await Promise.all(
          report.media
            .filter(item => item.contentType.startsWith("image/"))
            .map(async item => {
              const blob = await authorizedBlob(`/media/${item.id}/content`);
              const url = URL.createObjectURL(blob);
              allocatedUrls.push(url);
              return [item.id, url] as const;
            }),
        );
        if (!active) return;
        setDetail(report);
        setImageUrls(Object.fromEntries(loadedImages));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load this complaint.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      allocatedUrls.forEach(URL.revokeObjectURL);
    };
  }, [complaintId]);

  if (!complaintId) return null;

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="complaint-detail-title">
    <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="eyebrow">Citizen report</p>
          <h2 id="complaint-detail-title" className="mt-1 text-xl font-bold text-slate-950">Complaint details</h2>
        </div>
        <button className="btn-secondary shrink-0" onClick={onClose} aria-label="Close complaint details">Close</button>
      </div>

      {loading && <p className="py-10 text-center text-sm text-slate-500">Loading the citizen report…</p>}
      {error && <p className="alert-error mt-5">{error}</p>}
      {detail && <div className="space-y-6 pt-6">
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={detail.complaint.status} />
          {detail.complaint.severity && <StatusBadge value={detail.complaint.severity} />}
        </div>

        <section className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Complaint description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{detail.complaint.description || "No description was provided."}</p>
          <p className="mt-3 text-xs text-slate-500">Submitted {new Date(detail.complaint.createdAt).toLocaleString()}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reported by</p>
            <p className="mt-2 font-semibold text-slate-900">{detail.reporter.fullName}</p>
            <p className="mt-1 text-sm text-slate-600">{detail.reporter.email}</p>
            {detail.reporter.phone && <p className="mt-1 text-sm text-slate-600">{detail.reporter.phone}</p>}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Reported location</p>
            <p className="mt-2 font-mono text-sm text-slate-800">{detail.complaint.latitude.toFixed(6)}, {detail.complaint.longitude.toFixed(6)}</p>
            <a className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-2" href={`https://www.openstreetmap.org/?mlat=${detail.complaint.latitude}&mlon=${detail.complaint.longitude}#map=18/${detail.complaint.latitude}/${detail.complaint.longitude}`} target="_blank" rel="noreferrer">Open location on map</a>
          </div>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Citizen evidence</p>
          {detail.media.length === 0 ? <p className="mt-2 text-sm text-slate-500">No evidence file was attached to this report.</p> : <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {detail.media.map(item => <div className="overflow-hidden rounded-xl border border-slate-200" key={item.id}>
              {imageUrls[item.id] ? <img src={imageUrls[item.id]} alt={`Citizen evidence: ${item.filename}`} className="h-52 w-full bg-slate-100 object-cover" /> : <div className="flex h-52 items-center justify-center bg-slate-100 p-4 text-center text-sm text-slate-500">{item.contentType.startsWith("image/") ? "Loading image…" : "This attachment is not an image."}</div>}
              <div className="p-3"><p className="truncate text-sm font-medium text-slate-800" title={item.filename}>{item.filename}</p><p className="mt-1 text-xs text-slate-500">{item.kind} · {formatSize(item.sizeBytes)}</p></div>
            </div>)}
          </div>}
        </section>
      </div>}
    </div>
  </div>;
}
