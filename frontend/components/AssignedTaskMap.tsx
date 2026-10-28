"use client";

type Props = { boundaryGeoJson?: string; latitude?: number; longitude?: number; className?: string };

type Point = { latitude: number; longitude: number };

function mapFocus(boundaryGeoJson?: string, latitude?: number, longitude?: number) {
  const fallback = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;
  try {
    const geometry = boundaryGeoJson ? JSON.parse(boundaryGeoJson) : null;
    const ring: unknown[] | undefined = geometry?.type === "Polygon" ? geometry.coordinates?.[0] : undefined;
    if (!ring?.length) return fallback;
    const points = ring
      .filter((value): value is [number, number] => Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number")
      .map(([pointLongitude, pointLatitude]) => ({ latitude: pointLatitude, longitude: pointLongitude }));
    if (!points.length) return fallback;
    const minLatitude = Math.min(...points.map(point => point.latitude));
    const maxLatitude = Math.max(...points.map(point => point.latitude));
    const minLongitude = Math.min(...points.map(point => point.longitude));
    const maxLongitude = Math.max(...points.map(point => point.longitude));
    return {
      latitude: fallback?.latitude ?? (minLatitude + maxLatitude) / 2,
      longitude: fallback?.longitude ?? (minLongitude + maxLongitude) / 2,
      minLatitude, maxLatitude, minLongitude, maxLongitude,
    };
  } catch { return fallback; }
}

export function AssignedTaskMap({ boundaryGeoJson, latitude, longitude, className = "" }: Props) {
  const focus = mapFocus(boundaryGeoJson, latitude, longitude);
  if (!focus) return <p className="text-sm text-slate-500">The assigned location is unavailable.</p>;
  const padding = 0.0015;
  const minLongitude = "minLongitude" in focus ? focus.minLongitude - padding : focus.longitude - padding;
  const maxLongitude = "maxLongitude" in focus ? focus.maxLongitude + padding : focus.longitude + padding;
  const minLatitude = "minLatitude" in focus ? focus.minLatitude - padding : focus.latitude - padding;
  const maxLatitude = "maxLatitude" in focus ? focus.maxLatitude + padding : focus.latitude + padding;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${minLongitude},${minLatitude},${maxLongitude},${maxLatitude}`)}&layer=mapnik&marker=${focus.latitude},${focus.longitude}`;
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${focus.latitude}&mlon=${focus.longitude}#map=18/${focus.latitude}/${focus.longitude}`;

  return <div className={className}>
    <iframe title="Assigned collection location" className="h-72 w-full rounded-xl border border-slate-200 bg-slate-100" src={mapUrl} loading="lazy" />
    <a href={openMapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-2">Open route location in map</a>
  </div>;
}
