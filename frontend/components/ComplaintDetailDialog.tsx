"use client";

import { useEffect, useState } from "react";
import { api, authorizedBlob } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import { X, MapPin, ExternalLink } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="complaint-detail-title">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="eyebrow">Citizen Report Dossier</span>
            <h2 id="complaint-detail-title" className="mt-1 text-2xl font-extrabold text-slate-950">Incident Investigation</h2>
          </div>
          <button className="btn-secondary btn-sm shrink-0 inline-flex items-center gap-1.5" onClick={onClose} aria-label="Close complaint details">
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-700 border-r-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Loading citizen report & photos…</p>
          </div>
        )}

        {error && (
          <div className="alert-error mt-5">
            <p className="font-semibold text-xs">Error</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        )}

        {detail && (
          <div className="space-y-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <StatusBadge value={detail.complaint.status} />
                {detail.complaint.severity && <StatusBadge value={detail.complaint.severity} />}
              </div>
              <span className="text-xs text-slate-400">
                Submitted {new Date(detail.complaint.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>

            <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Report Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                {detail.complaint.description || "No description was provided."}
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reporter Identity</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{detail.reporter.fullName}</p>
                <p className="mt-1 text-xs text-slate-500">{detail.reporter.email}</p>
                {detail.reporter.phone && <p className="mt-0.5 text-xs text-slate-500">{detail.reporter.phone}</p>}
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reported GPS Location</p>
                <p className="mt-2 font-mono text-xs font-bold text-brand-800">
                  {detail.complaint.latitude.toFixed(6)}, {detail.complaint.longitude.toFixed(6)}
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  href={`https://www.openstreetmap.org/?mlat=${detail.complaint.latitude}&mlon=${detail.complaint.longitude}#map=18/${detail.complaint.latitude}/${detail.complaint.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand-700" />
                  <span>Open live route in OpenStreetMap</span>
                  <ExternalLink className="w-3 h-3 text-brand-700" />
                </a>
              </div>
            </section>

            <section>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Citizen Photographic Evidence</p>
              {detail.media.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">No evidence file was attached to this report.</p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {detail.media.map(item => (
                    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm" key={item.id}>
                      {imageUrls[item.id] ? (
                        <img src={imageUrls[item.id]} alt={`Citizen evidence: ${item.filename}`} className="h-56 w-full bg-slate-100 object-cover" />
                      ) : (
                        <div className="flex h-56 items-center justify-center bg-slate-50 p-4 text-center text-xs text-slate-400">
                          {item.contentType.startsWith("image/") ? "Loading image…" : "Non-image attachment"}
                        </div>
                      )}
                      <div className="p-3 border-t border-slate-100">
                        <p className="truncate text-xs font-bold text-slate-900" title={item.filename}>{item.filename}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{item.kind} · {formatSize(item.sizeBytes)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
