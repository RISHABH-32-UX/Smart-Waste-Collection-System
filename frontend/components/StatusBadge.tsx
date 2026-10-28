const STATUS_STYLES: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-50 text-amber-800 ring-amber-600/20",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  ASSIGNED: "bg-blue-50 text-blue-800 ring-blue-600/20",
  IN_PROGRESS: "bg-indigo-50 text-indigo-800 ring-indigo-600/20",
  ON_SITE: "bg-cyan-50 text-cyan-800 ring-cyan-600/20",
  CLEANED: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  RESOLVED: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-500/20",
  REJECTED: "bg-red-50 text-red-800 ring-red-600/20",
  HIGH: "bg-red-50 text-red-800 ring-red-600/20",
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  INACTIVE: "bg-red-50 text-red-800 ring-red-600/20",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-600/20",
  LOW: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
};

export function StatusBadge({ value }: { value: string }) {
  const style = STATUS_STYLES[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/20";
  return (
    <span className={`badge ring-1 ring-inset font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shrink-0" aria-hidden="true" />
      <span>{value.replaceAll("_", " ")}</span>
    </span>
  );
}
