"use client";

import { useEffect, useState } from "react";
import { authorizedBlob } from "../lib/api";

type Props = { assetId: string; alt: string; className?: string };

/** Renders a private upload only after retrieving it with the current user's JWT. */
export function PrivateImage({ assetId, alt, className = "" }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setUrl("");
    setError("");
    authorizedBlob(`/media/${assetId}/content`)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setUrl(objectUrl);
      })
      .catch(() => { if (active) setError("Image unavailable"); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  if (error) return <div className={`flex items-center justify-center bg-slate-100 p-3 text-center text-xs text-slate-500 ${className}`}>{error}</div>;
  if (!url) return <div className={`animate-pulse bg-slate-100 ${className}`} aria-label="Loading protected image" />;
  return <img src={url} alt={alt} className={className} />;
}
