"use client";

import { useEffect, useState } from "react";
import { api, authorizedBlob } from "../lib/api";
import { StatusBadge } from "./StatusBadge";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
} from "lucide-react";

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
            })
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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-detail-title"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/90 px-6 py-4 bg-slate-50/80">
          <div>
            <p className="eyebrow">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>Supervisor Inspection</span>
            </p>
            <h2 id="complaint-detail-title" className="text-lg font-bold text-slate-900 mt-0.5">
              Citizen Complaint #{complaintId.slice(0, 8)}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            onClick={onClose}
            aria-label="Close complaint details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-14 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-slate-600">Loading citizen report & evidence…</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {/* Badges & Geolocation Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={detail.complaint.status} />
                  {detail.complaint.severity && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-500">AI Priority:</span>
                      <StatusBadge value={detail.complaint.severity} />
                    </div>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <span>{detail.complaint.latitude.toFixed(6)}, {detail.complaint.longitude.toFixed(6)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>Reported Description & Landmark</span>
                </h3>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
                  {detail.complaint.description}
                </div>
              </div>

              {/* Reporter Info */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Citizen Contact Details</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Full Name</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{detail.reporter.fullName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Email</span>
                    <p className="font-semibold text-slate-900 mt-0.5 truncate">{detail.reporter.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Phone</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{detail.reporter.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Media Evidence Gallery */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Photographic Evidence ({detail.media.length})</span>
                </h3>

                {detail.media.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {detail.media.map(media => {
                      const url = imageUrls[media.id];
                      return (
                        <figure
                          key={media.id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={media.filename}
                              className="h-52 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-52 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          )}
                          <figcaption className="flex items-center justify-between p-3 border-t border-slate-100 text-xs">
                            <span className="truncate font-semibold text-slate-800">{media.filename}</span>
                            <span className="text-slate-400">{formatSize(media.sizeBytes)}</span>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No photos attached to this report.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
          <button type="button" className="btn-secondary text-xs sm:text-sm" onClick={onClose}>
            Close Inspection Dialog
          </button>
        </div>
      </div>
    </div>
  );
}